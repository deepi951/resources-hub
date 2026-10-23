import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { createSecret, hashSecret, isEligibleResetAccount, isPsgTechEmail, isValidNewPassword, maskPhone, normalizeEmail, normalizePhone } from './security.js'

initializeApp()

const db = getFirestore()
const emailProviderKey = defineSecret('RESEND_API_KEY')
const smsAccountSid = defineSecret('TWILIO_ACCOUNT_SID')
const smsAuthToken = defineSecret('TWILIO_AUTH_TOKEN')
const smsVerifyServiceSid = defineSecret('TWILIO_VERIFY_SERVICE_SID')
const resetFromEmail = defineString('RESET_FROM_EMAIL')
const webAppUrl = defineString('WEB_APP_URL')

const RESET_LINK_TTL_MS = 30 * 60 * 1000
const RESET_OTP_TTL_MS = 10 * 60 * 1000
const PHONE_OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_OTP_ATTEMPTS = 5
const MAX_OTP_RESENDS = 3
const GENERIC_RESET_RESPONSE = 'If the account is eligible, password reset instructions will be sent to its registered email.'

const timestampNow = () => Date.now()
const timestampMillis = (value) =>
  typeof value?.toMillis === 'function' ? value.toMillis() : Number(value)
const documentBySecret = (collectionName, secret) =>
  db.collection(collectionName).doc(hashSecret(secret))

const requireSmsConfiguration = () => {
  const accountSid = smsAccountSid.value()
  const authToken = smsAuthToken.value()
  const serviceSid = smsVerifyServiceSid.value()

  if (!accountSid || !authToken || !serviceSid) {
    throw new HttpsError('failed-precondition', 'SMS OTP is not configured. Contact the administrator.')
  }

  return { accountSid, authToken, serviceSid }
}

const requireEmailConfiguration = () => {
  const apiKey = emailProviderKey.value()
  const from = resetFromEmail.value()
  const appUrl = webAppUrl.value()

  if (!apiKey || !from || !appUrl) {
    throw new HttpsError('failed-precondition', 'Password reset email is not configured. Contact the administrator.')
  }

  let parsedUrl
  try {
    parsedUrl = new URL(appUrl)
  } catch {
    throw new HttpsError('failed-precondition', 'Password reset email is not configured. Contact the administrator.')
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new HttpsError('failed-precondition', 'Password reset email is not configured. Contact the administrator.')
  }

  return { apiKey, from, appUrl: parsedUrl.origin }
}

const providerRequest = async (url, values, accountSid, authToken) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(values),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error('SMS provider request failed')
  return result
}

const sendSmsCode = async (phone) => {
  const { accountSid, authToken, serviceSid } = requireSmsConfiguration()
  await providerRequest(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    { To: phone, Channel: 'sms' },
    accountSid,
    authToken
  )
}

const checkSmsCode = async (phone, code) => {
  const { accountSid, authToken, serviceSid } = requireSmsConfiguration()
  const result = await providerRequest(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    { To: phone, Code: code },
    accountSid,
    authToken
  )
  return result.status === 'approved'
}

const sendResetEmail = async (email, resetToken) => {
  const { apiKey, from, appUrl } = requireEmailConfiguration()
  const link = `${appUrl}/#/reset-password?token=${encodeURIComponent(resetToken)}`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your ResourceHub password',
      text: `Use this one-time link within 30 minutes to reset your ResourceHub password. You will also need the mobile phone registered on your account.\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    }),
  })

  if (!response.ok) throw new Error('Email provider request failed')
}

const consumeRateLimit = async (key, maximum, windowMs) => {
  const ref = db.collection('securityRateLimits').doc(hashSecret(key))
  const now = timestampNow()

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const current = snapshot.exists ? snapshot.data() : {}
    const activeWindow = Number(current.windowStartedAt) > now - windowMs
    const count = activeWindow ? Number(current.count || 0) : 0

    if (count >= maximum) return false

    transaction.set(ref, {
      windowStartedAt: activeWindow ? current.windowStartedAt : now,
      count: count + 1,
      expiresAt: Timestamp.fromMillis(now + windowMs),
    })
    return true
  })
}

const trustedProfileForEmail = async (email) => {
  let user
  try {
    user = await getAuth().getUserByEmail(email)
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null
    throw error
  }

  if (!user.emailVerified || !isPsgTechEmail(user.email || email)) return null

  const profileSnapshot = await db.collection('users').doc(user.uid).get()
  if (!profileSnapshot.exists) return null

  const profile = profileSnapshot.data()
  if (!isEligibleResetAccount(user, profile)) return null
  const phone = normalizePhone(profile.phone)

  return { user, profile, phone }
}

const requireValidRecord = (record, now, expiredMessage, usedMessage) => {
  if (!record || timestampMillis(record.expiresAt) <= now) {
    throw new HttpsError('failed-precondition', expiredMessage)
  }
  if (record.consumedAt) throw new HttpsError('failed-precondition', usedMessage)
}

export const requestPasswordReset = onCall(
  { secrets: [emailProviderKey] },
  async (request) => {
    const email = normalizeEmail(request.data?.email)
    if (!isPsgTechEmail(email)) return { message: GENERIC_RESET_RESPONSE }

    requireEmailConfiguration()

    const ip = request.rawRequest?.ip || 'unknown'
    const allowedByEmail = await consumeRateLimit(`reset-email:${email}`, 3, 60 * 60 * 1000)
    const allowedByIp = await consumeRateLimit(`reset-ip:${ip}`, 10, 60 * 60 * 1000)
    if (!allowedByEmail || !allowedByIp) return { message: GENERIC_RESET_RESPONSE }

    let account
    try {
      account = await trustedProfileForEmail(email)
    } catch {
      logger.error('Password reset account lookup failed')
      return { message: GENERIC_RESET_RESPONSE }
    }
    if (!account) return { message: GENERIC_RESET_RESPONSE }

    const token = createSecret()
    const expiresAt = Timestamp.fromMillis(timestampNow() + RESET_LINK_TTL_MS)
    const resetRef = documentBySecret('passwordResetLinks', token)
    const guardRef = db.collection('passwordResetGuards').doc(account.user.uid)
    const issued = await db.runTransaction(async (transaction) => {
      const guardSnapshot = await transaction.get(guardRef)
      const guard = guardSnapshot.exists ? guardSnapshot.data() : { epoch: 0 }
      if (isResetLocked(guard, timestampNow())) return false
      transaction.set(resetRef, {
        uid: account.user.uid,
        epoch: guard.epoch || 0,
        expiresAt,
        consumedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
      return true
    })
    if (!issued) return { message: GENERIC_RESET_RESPONSE }

    try {
      await sendResetEmail(email, token)
    } catch {
      await resetRef.delete()
      logger.error('Password reset email delivery failed')
      return { message: GENERIC_RESET_RESPONSE }
    }

    return { message: GENERIC_RESET_RESPONSE }
  }
)

export const beginPasswordReset = onCall(
  { secrets: [smsAccountSid, smsAuthToken, smsVerifyServiceSid] },
  async (request) => {
    const emailToken = String(request.data?.token || '')
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(emailToken)) {
      throw new HttpsError('failed-precondition', 'This reset link is invalid. Request a new reset link.')
    }

    const resetRef = documentBySecret('passwordResetLinks', emailToken)
    const resetSnapshot = await resetRef.get()
    const reset = resetSnapshot.exists ? resetSnapshot.data() : null
    requireValidRecord(reset, timestampNow(), 'This reset link is invalid or expired. Request a new reset link.', 'This reset link has already been used. Request a new reset link.')

    const user = await getAuth().getUser(reset.uid)
    const profileSnapshot = await db.collection('users').doc(user.uid).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    const phone = profile?.phoneVerified === true ? normalizePhone(profile.phone) : null
    if (!isEligibleResetAccount(user, profile) || !phone) {
      throw new HttpsError('failed-precondition', 'A verified mobile number is required. Sign in and verify the number in your profile, then request a new reset link.')
    }

    const challengeToken = createSecret()
    const challengeRef = documentBySecret('passwordResetChallenges', challengeToken)
    const guardRef = db.collection('passwordResetGuards').doc(user.uid)
    const profileRef = db.collection('users').doc(user.uid)
    const now = timestampNow()

    await db.runTransaction(async (transaction) => {
      const [currentSnapshot, guardSnapshot, currentProfileSnapshot] = await Promise.all([
        transaction.get(resetRef),
        transaction.get(guardRef),
        transaction.get(profileRef),
      ])
      const current = currentSnapshot.exists ? currentSnapshot.data() : null
      const guard = guardSnapshot.exists ? guardSnapshot.data() : { epoch: 0 }
      const currentProfile = currentProfileSnapshot.exists ? currentProfileSnapshot.data() : null
      requireValidRecord(current, now, 'This reset link is invalid or expired. Request a new reset link.', 'This reset link has already been used. Request a new reset link.')
      if (isResetLocked(guard, now) || current.epoch !== (guard.epoch || 0)) {
        throw new HttpsError('failed-precondition', 'This reset link is no longer valid. Request a new reset link.')
      }
      if (!isEligibleResetAccount(user, currentProfile) || normalizePhone(currentProfile.phone) !== phone) {
        throw new HttpsError('failed-precondition', 'A verified mobile number is required. Sign in and verify the number in your profile, then request a new reset link.')
      }
      transaction.update(resetRef, { consumedAt: now })
      transaction.set(challengeRef, {
        uid: user.uid,
        epoch: guard.epoch || 0,
        phoneHash: hashSecret(phone),
        expiresAt: Timestamp.fromMillis(now + RESET_OTP_TTL_MS),
        otpVerified: false,
        attempts: 0,
        resendCount: 0,
        lastSentAt: now,
        consumedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    try {
      await sendSmsCode(phone)
    } catch {
      await challengeRef.delete()
      logger.error('Password reset SMS delivery failed')
      throw new HttpsError('unavailable', 'Mobile OTP is not available. Request a new reset link or contact the administrator.')
    }

    return { challengeToken, maskedPhone: maskPhone(phone) }
  }
)

export const resendPasswordResetOtp = onCall(
  { secrets: [smsAccountSid, smsAuthToken, smsVerifyServiceSid] },
  async (request) => {
    const token = String(request.data?.challengeToken || '')
    const challengeRef = documentBySecret('passwordResetChallenges', token)
    const now = timestampNow()
    const outcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeRef)
      const challenge = snapshot.exists ? snapshot.data() : null
      if (!challenge || timestampMillis(challenge.expiresAt) <= now || challenge.consumedAt) {
        throw new HttpsError('failed-precondition', 'This reset session expired. Request a new reset link.')
      }
      if (challenge.otpVerified) throw new HttpsError('failed-precondition', 'Mobile verification is already complete.')
      if (challenge.resendCount >= MAX_OTP_RESENDS) {
        throw new HttpsError('resource-exhausted', 'Maximum OTP resends reached. Request a new reset link.')
      }
      if (now - Number(challenge.lastSentAt) < RESEND_COOLDOWN_MS) {
        throw new HttpsError('resource-exhausted', 'Please wait before requesting another OTP.')
      }
      transaction.update(challengeRef, { resendCount: challenge.resendCount + 1, lastSentAt: now })
      return challenge
    })

    const profileSnapshot = await db.collection('users').doc(outcome.uid).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    const phone = profile?.phoneVerified === true ? normalizePhone(profile.phone) : null
    if (!phone || hashSecret(phone) !== outcome.phoneHash) {
      throw new HttpsError('failed-precondition', 'The verified mobile number changed. Request a new reset link.')
    }

    try {
      await sendSmsCode(phone)
    } catch {
      logger.error('Password reset OTP resend failed')
      throw new HttpsError('unavailable', 'Unable to send a mobile OTP right now.')
    }

    return { message: 'A new OTP was sent.' }
  }
)

export const verifyPasswordResetOtp = onCall(
  { secrets: [smsAccountSid, smsAuthToken, smsVerifyServiceSid] },
  async (request) => {
    const token = String(request.data?.challengeToken || '')
    const code = String(request.data?.code || '').trim()
    if (!/^\d{4,10}$/.test(code)) throw new HttpsError('invalid-argument', 'Enter the OTP from your SMS.')

    const challengeRef = documentBySecret('passwordResetChallenges', token)
    const now = timestampNow()
    const challenge = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeRef)
      const current = snapshot.exists ? snapshot.data() : null
      if (!current || timestampMillis(current.expiresAt) <= now || current.consumedAt) {
        throw new HttpsError('failed-precondition', 'This reset session expired. Request a new reset link.')
      }
      if (current.otpVerified) return current
      if (current.attempts >= MAX_OTP_ATTEMPTS) {
        throw new HttpsError('resource-exhausted', 'Too many incorrect OTP attempts. Request a new reset link.')
      }
      transaction.update(challengeRef, { attempts: current.attempts + 1 })
      return current
    })

    if (challenge.otpVerified) return { verified: true }

    const profileSnapshot = await db.collection('users').doc(challenge.uid).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    const phone = profile?.phoneVerified === true ? normalizePhone(profile.phone) : null
    if (!phone || hashSecret(phone) !== challenge.phoneHash) {
      throw new HttpsError('failed-precondition', 'The verified mobile number changed. Request a new reset link.')
    }

    let approved = false
    try {
      approved = await checkSmsCode(phone, code)
    } catch {
      throw new HttpsError('unavailable', 'Unable to verify the OTP right now. Please try again.')
    }
    if (!approved) throw new HttpsError('unauthenticated', 'That OTP is incorrect, expired, or already used.')

    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(challengeRef)
      const current = currentSnapshot.exists ? currentSnapshot.data() : null
      if (!current || timestampMillis(current.expiresAt) <= timestampNow() || current.consumedAt) {
        throw new HttpsError('failed-precondition', 'This reset session expired. Request a new reset link.')
      }
      if (current.otpVerified) return
      transaction.update(challengeRef, { otpVerified: true, otpVerifiedAt: FieldValue.serverTimestamp() })
    })
    return { verified: true }
  }
)

export const completePasswordReset = onCall(async (request) => {
  const token = String(request.data?.challengeToken || '')
  const password = request.data?.password
  if (!isValidNewPassword(password)) {
    throw new HttpsError('invalid-argument', 'Use at least 8 characters with uppercase, lowercase, and a number.')
  }

  const challengeRef = documentBySecret('passwordResetChallenges', token)
  const now = timestampNow()
  const initialSnapshot = await challengeRef.get()
  const initialChallenge = initialSnapshot.exists ? initialSnapshot.data() : null
  if (!initialChallenge) {
    throw new HttpsError('failed-precondition', 'This reset session expired or has already been used. Request a new reset link.')
  }
  const guardRef = db.collection('passwordResetGuards').doc(initialChallenge.uid)
  const profileRef = db.collection('users').doc(initialChallenge.uid)
  const lockToken = hashSecret(token)
  const challenge = await db.runTransaction(async (transaction) => {
    const [snapshot, guardSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(challengeRef),
      transaction.get(guardRef),
      transaction.get(profileRef),
    ])
    const current = snapshot.exists ? snapshot.data() : null
    const guard = guardSnapshot.exists ? guardSnapshot.data() : { epoch: 0 }
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    if (!current || timestampMillis(current.expiresAt) <= now || current.consumedAt) {
      throw new HttpsError('failed-precondition', 'This reset session expired or has already been used. Request a new reset link.')
    }
    if (!current.otpVerified) {
      throw new HttpsError('permission-denied', 'Verify the mobile OTP before setting a new password.')
    }
    if (isResetLocked(guard, now) || current.epoch !== (guard.epoch || 0)) {
      throw new HttpsError('failed-precondition', 'This reset session is no longer valid. Request a new reset link.')
    }
    if (profile?.uid !== initialChallenge.uid || profile?.role !== 'student' || profile.phoneVerified !== true || profile.status === 'blocked' || hashSecret(normalizePhone(profile.phone) || '') !== current.phoneHash) {
      throw new HttpsError('failed-precondition', 'The verified mobile number changed. Request a new reset link.')
    }
    transaction.update(challengeRef, { consumedAt: now })
    transaction.set(guardRef, {
      epoch: (guard.epoch || 0) + 1,
      lockUntil: Timestamp.fromMillis(now + 2 * 60 * 1000),
      lockToken,
    }, { merge: true })
    return current
  })

  const releaseGuard = async () => db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(guardRef)
    if (snapshot.exists && snapshot.data().lockToken === lockToken) {
      transaction.update(guardRef, { lockUntil: null, lockToken: null })
    }
  })

  try {
    await getAuth().updateUser(challenge.uid, { password })
  } catch {
    await releaseGuard()
    logger.error('Firebase Auth password update failed')
    throw new HttpsError('failed-precondition', 'The password could not be updated. Request a new reset link and try again.')
  }

  try {
    const outstandingLinks = await db.collection('passwordResetLinks').where('uid', '==', challenge.uid).get()
    const outstandingChallenges = await db.collection('passwordResetChallenges').where('uid', '==', challenge.uid).get()
    const invalidations = [...outstandingLinks.docs, ...outstandingChallenges.docs]
    for (let offset = 0; offset < invalidations.length; offset += 450) {
      const batch = db.batch()
      invalidations.slice(offset, offset + 450).forEach((snapshot) => batch.delete(snapshot.ref))
      await batch.commit()
    }
  } catch {
    logger.error('Reset-session cleanup failed after password update')
  } finally {
    await releaseGuard()
  }

  try {
    await getAuth().revokeRefreshTokens(challenge.uid)
  } catch {
    logger.error('Firebase Auth session revocation failed after password reset')
  }

  return { message: 'Your password has been updated.' }
})

export const startProfilePhoneVerification = onCall(
  { secrets: [smsAccountSid, smsAuthToken, smsVerifyServiceSid] },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to verify your profile phone number.')
    const uid = request.auth.uid
    const user = await getAuth().getUser(uid)
    if (!user.emailVerified) throw new HttpsError('failed-precondition', 'Verify your email before verifying your phone number.')

    const profileRef = db.collection('users').doc(uid)
    const profileSnapshot = await profileRef.get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    const phone = normalizePhone(profile?.phone)
    if (!phone || profile.status === 'blocked') throw new HttpsError('failed-precondition', 'Add a valid Indian mobile number to your profile first.')

    const allowed = await consumeRateLimit(`profile-phone:${uid}`, 3, 60 * 60 * 1000)
    if (!allowed) throw new HttpsError('resource-exhausted', 'Too many phone verification requests. Try again later.')

    const challengeRef = db.collection('phoneVerificationChallenges').doc(uid)
    const now = timestampNow()
    await db.runTransaction(async (transaction) => {
      const previous = await transaction.get(challengeRef)
      if (previous.exists && now - Number(previous.data().lastSentAt || 0) < RESEND_COOLDOWN_MS) {
        throw new HttpsError('resource-exhausted', 'Please wait before requesting another OTP.')
      }
      transaction.set(challengeRef, {
        phoneHash: hashSecret(phone),
        expiresAt: Timestamp.fromMillis(now + PHONE_OTP_TTL_MS),
        attempts: 0,
        lastSentAt: now,
      })
    })
    try {
      await sendSmsCode(phone)
    } catch {
      await challengeRef.delete()
      logger.error('Profile phone verification SMS delivery failed')
      throw new HttpsError('unavailable', 'SMS OTP is not configured or is unavailable. Contact the administrator.')
    }
    return { message: `A verification code was sent to ${maskPhone(phone)}.` }
  }
)

export const confirmProfilePhoneVerification = onCall(
  { secrets: [smsAccountSid, smsAuthToken, smsVerifyServiceSid] },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to verify your profile phone number.')
    const uid = request.auth.uid
    const code = String(request.data?.code || '').trim()
    if (!/^\d{4,10}$/.test(code)) throw new HttpsError('invalid-argument', 'Enter the OTP from your SMS.')

    const challengeRef = db.collection('phoneVerificationChallenges').doc(uid)
    const now = timestampNow()
    const challenge = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeRef)
      const current = snapshot.exists ? snapshot.data() : null
      if (!current || timestampMillis(current.expiresAt) <= now) {
        throw new HttpsError('failed-precondition', 'The phone verification code expired. Request another code.')
      }
      if (current.attempts >= MAX_OTP_ATTEMPTS) {
        throw new HttpsError('resource-exhausted', 'Too many incorrect OTP attempts. Request another code later.')
      }
      transaction.update(challengeRef, { attempts: current.attempts + 1 })
      return current
    })

    const profileRef = db.collection('users').doc(uid)
    const profileSnapshot = await profileRef.get()
    const phone = normalizePhone(profileSnapshot.data()?.phone)
    if (!phone || hashSecret(phone) !== challenge.phoneHash) {
      await challengeRef.delete()
      throw new HttpsError('failed-precondition', 'The profile phone number changed. Request a new verification code.')
    }

    let approved = false
    try {
      approved = await checkSmsCode(phone, code)
    } catch {
      throw new HttpsError('unavailable', 'Unable to verify the OTP right now. Please try again.')
    }
    if (!approved) throw new HttpsError('unauthenticated', 'That OTP is incorrect, expired, or already used.')

    await db.runTransaction(async (transaction) => {
      const [currentProfile, currentChallenge] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(challengeRef),
      ])
      if (!currentProfile.exists || !currentChallenge.exists || timestampMillis(currentChallenge.data().expiresAt) <= timestampNow()) {
        throw new HttpsError('failed-precondition', 'The phone verification code expired. Request another code.')
      }
      const currentPhone = normalizePhone(currentProfile.data().phone)
      if (!currentPhone || hashSecret(currentPhone) !== currentChallenge.data().phoneHash) {
        throw new HttpsError('failed-precondition', 'The profile phone number changed. Request a new verification code.')
      }
      transaction.update(profileRef, {
        phoneVerified: true,
        phoneVerifiedAt: FieldValue.serverTimestamp(),
      })
      transaction.delete(challengeRef)
    })

    return { verified: true }
  }
)