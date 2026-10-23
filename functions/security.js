import { createHash, randomBytes } from 'node:crypto'

export const createSecret = () => randomBytes(32).toString('base64url')

export const hashSecret = (secret) =>
  createHash('sha256').update(String(secret)).digest('hex')

export const normalizePhone = (phone = '') => {
  const value = String(phone).replace(/[\s()-]/g, '')
  if (/^\d{10}$/.test(value)) return `+91${value}`
  if (/^\+91\d{10}$/.test(value)) return value
  return null
}

export const maskPhone = (phone) => {
  const normalized = normalizePhone(phone)
  return normalized ? `******${normalized.slice(-4)}` : 'your registered number'
}

export const isValidNewPassword = (password) =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password)

export const normalizeEmail = (email = '') =>
  String(email).trim().toLowerCase()

export const isPsgTechEmail = (email) =>
  /^[a-z0-9._%+-]+@psgtech\.ac\.in$/i.test(email)

export const isEligibleResetAccount = (user, profile) =>
  Boolean(
    user?.emailVerified === true &&
    isPsgTechEmail(user.email || '') &&
    profile?.uid === user.uid &&
    profile?.role === 'student' &&
    profile?.phoneVerified === true &&
    normalizePhone(profile.phone) &&
    profile?.status !== 'blocked'
  )