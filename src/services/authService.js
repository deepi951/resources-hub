import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'

import {
  auth,
  db,
  functions,
  firebaseConfigured,
} from '../firebase/firebaseConfig'


// ============================================================
// FIREBASE CHECK
// ============================================================

const ensureFirebaseReady = () => {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error(
      'Firebase is not configured yet. Add your .env values to enable authentication and marketplace data.'
    )
  }
}


// ============================================================
// FIREBASE AUTH ERROR MESSAGES
// ============================================================

const getFirebaseAuthErrorMessage = (
  error,
  fallback = 'Unable to complete this request.'
) => {
  const code = error?.code || ''

  const codeMessages = {
    'auth/email-already-in-use':
      'This PSG Tech email is already registered.',

    'auth/invalid-email':
      'Please enter a valid PSG Tech email address.',

    'auth/weak-password':
      'Your password is too weak. Choose a stronger password.',

    'auth/network-request-failed':
      'Network error. Please check your internet connection and try again.',

    'auth/too-many-requests':
      'Too many requests. Please try again later.',

    'auth/invalid-credential':
      'Invalid email or password.',

    'auth/user-not-found':
      'No account was found with this email.',

    'auth/wrong-password':
      'Incorrect password.',
  }

  return codeMessages[code] || error?.message || fallback
}


// ============================================================
// VALIDATION
// ============================================================

export const isValidPsgTechEmail = (email = '') =>
  /^[A-Za-z0-9._%+-]+@psgtech\.ac\.in$/i.test(
    email.trim()
  )


export const isValidIndianPhone = (phone = '') => {
  const cleaned = phone.trim()

  if (!cleaned) return false

  // +919876543210
  if (/^\+91\d{10}$/.test(cleaned)) {
    return true
  }

  // 9876543210
  if (/^\d{10}$/.test(cleaned)) {
    return true
  }

  return false
}


// ============================================================
// REGISTER STUDENT
// ============================================================

export const registerStudent = async ({
  fullName,
  department,
  block,
  registerNumber,
  email,
  phone,
  password,
}) => {
  ensureFirebaseReady()

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()

  if (!isValidPsgTechEmail(normalizedEmail)) {
    throw new Error(
      'Use a valid PSG Tech email ending with @psgtech.ac.in'
    )
  }

  if (!isValidIndianPhone(phone)) {
    throw new Error(
      'Enter a valid Indian phone number'
    )
  }

  try {
    // --------------------------------------------------------
    // Create Firebase Authentication account
    // --------------------------------------------------------

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      )

    const { user } = userCredential


    // --------------------------------------------------------
    // Set Firebase Auth display name
    // --------------------------------------------------------

    await updateProfile(user, {
      displayName: fullName.trim(),
    })


    // --------------------------------------------------------
    // Create Firestore user profile
    // --------------------------------------------------------

    const now = new Date().toISOString()

    const profilePayload = {
      uid: user.uid,

      fullName: fullName.trim(),

      displayName: fullName.trim(),

      department:
        department?.trim() || 'CSE',

      block:
        block?.trim() || '',

      registerNumber:
        registerNumber?.trim() || '',

      email: normalizedEmail,

      phone:
        phone?.trim() || '',

      role: 'student',

      emailVerified: false,

      status: 'active',

      yearOfStudy: '',

      location: 'Campus',

      bio: 'Campus student selling and buying useful items.',

      createdAt: now,

      updatedAt: now,
    }


    await setDoc(
      doc(db, 'users', user.uid),
      profilePayload
    )


    // --------------------------------------------------------
    // Send verification email
    // --------------------------------------------------------

    try {
      await sendEmailVerification(user)
    } catch (verificationError) {
      console.error(
        'Failed to send verification email:',
        verificationError
      )

      throw new Error(
        `Account created, but the verification email could not be sent. Firebase error: ${
          verificationError.code || 'unknown-error'
        }`
      )
    }

    return user

  } catch (error) {
    const message =
      getFirebaseAuthErrorMessage(
        error,
        'Unable to create account right now.'
      )

    throw new Error(message)
  }
}


// ============================================================
// LOGIN STUDENT / USER
// ============================================================

export const loginStudent = async (
  email,
  password
) => {
  ensureFirebaseReady()

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase()

  const result =
    await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    )

  return result.user
}


// ============================================================
// LOGOUT
// ============================================================

export const logoutStudent = async () => {
  ensureFirebaseReady()

  await signOut(auth)
}


// ============================================================
// PASSWORD RESET AND PROFILE PHONE VERIFICATION
// ============================================================

const callResetFunction = async (name, payload) => {
  ensureFirebaseReady()
  if (!functions) throw new Error('Password reset services are not configured. Contact the administrator.')
  try {
    const result = await httpsCallable(functions, name)(payload)
    return result.data
  } catch (error) {
    const message = error?.message || 'Unable to complete this request.'
    throw new Error(message.replace(/^FirebaseError:\s*/i, ''))
  }
}

export const resetPassword = (email) =>
  callResetFunction('requestPasswordReset', { email: String(email || '').trim().toLowerCase() })

export const beginPasswordReset = (token) =>
  callResetFunction('beginPasswordReset', { token })

export const verifyPasswordResetOtp = (challengeToken, code) =>
  callResetFunction('verifyPasswordResetOtp', { challengeToken, code })

export const resendPasswordResetOtp = (challengeToken) =>
  callResetFunction('resendPasswordResetOtp', { challengeToken })

export const completePasswordReset = (challengeToken, password) =>
  callResetFunction('completePasswordReset', { challengeToken, password })

export const startProfilePhoneVerification = () =>
  callResetFunction('startProfilePhoneVerification', {})

export const confirmProfilePhoneVerification = (code) =>
  callResetFunction('confirmProfilePhoneVerification', { code })


// ============================================================
// GET SINGLE USER PROFILE
// ============================================================

export const getUserProfile = async (uid) => {
  ensureFirebaseReady()

  if (!uid) {
    return null
  }

  const profileRef = doc(
    db,
    'users',
    uid
  )

  const snapshot =
    await getDoc(profileRef)

  return snapshot.exists()
    ? snapshot.data()
    : null
}


// ============================================================
// UPDATE USER PROFILE
// ============================================================

export const updateUserProfile = async (
  uid,
  updates = {}
) => {
  ensureFirebaseReady()

  if (!uid) {
    throw new Error(
      'User ID is required to update the profile.'
    )
  }

  const profileRef = doc(
    db,
    'users',
    uid
  )

  await updateDoc(profileRef, {
    ...updates,

    updatedAt:
      new Date().toISOString(),
  })

  return getUserProfile(uid)
}


// ============================================================
// GET ALL STUDENTS
// ============================================================
//
// This is used by the ADMIN STUDENTS page.
//
// It reads the real users collection from Firestore
// and returns only users whose role is "student".
//
// ============================================================

export const getAllStudents = async () => {
  ensureFirebaseReady()

  const usersRef =
    collection(db, 'users')

  const snapshot =
    await getDocs(usersRef)

  const students =
    snapshot.docs
      .map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      }))
      .filter(
        (user) =>
          user.role === 'student'
      )

  return students
}


// ============================================================
// GET ALL USERS
// ============================================================
//
// Useful for admin dashboard statistics.
//
// ============================================================

export const getAllUsers = async () => {
  ensureFirebaseReady()

  const usersRef =
    collection(db, 'users')

  const snapshot =
    await getDocs(usersRef)

  return snapshot.docs.map(
    (docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })
  )
}


// ============================================================
// GET ADMIN USERS
// ============================================================
//
// Returns only users whose role is "admin".
//
// ============================================================

export const getAllAdmins = async () => {
  ensureFirebaseReady()

  const usersRef =
    collection(db, 'users')

  const snapshot =
    await getDocs(usersRef)

  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }))
    .filter(
      (user) =>
        user.role === 'admin'
    )
}


// ============================================================
// GET STUDENT SUMMARY
// ============================================================

export const getStudentSummary = (
  profile = {}
) => ({
  fullName:
    profile.fullName ||
    profile.displayName ||
    'Student',

  email:
    profile.email || '',

  phone:
    profile.phone || '',

  department:
    profile.department || 'CSE',

  block:
    profile.block || '',

  registerNumber:
    profile.registerNumber || '',

  location:
    profile.location || 'Campus',
})