import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

const ensureFirebaseReady = () => {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error('Firebase is not configured yet. Add your .env values before using the admin login.')
  }
}

export async function loginAdmin({ email, password }) {
  const trimmedEmail = String(email || '').trim()
  const trimmedPassword = String(password || '')

  if (!trimmedEmail || !trimmedPassword) {
    return { success: false, message: 'Please enter both admin email and password.' }
  }

  if (!firebaseConfigured || !auth || !db) {
    return { success: false, message: 'Firebase is not configured. Admin sign-in is unavailable.' }
  }

  ensureFirebaseReady()

  try {
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
    const { user } = userCredential

    if (!user.emailVerified) {
      await signOut(auth)
      return {
        success: false,
        message: 'Please verify your administrator email before signing in.'
      }
    }

    const profileRef = doc(db, 'users', user.uid)
    const snapshot = await getDoc(profileRef)

    if (!snapshot.exists()) {
      await signOut(auth)
      return {
        success: false,
        message: 'No administrator account was found with this email.'
      }
    }

    const profile = snapshot.data()

    if (profile?.role !== 'admin') {
      await signOut(auth)
      return {
        success: false,
        message: 'Admin access required.'
      }
    }

    return {
      success: true,
      user,
      profile,
      message: 'Admin access granted.'
    }
  } catch (error) {
    const code = error?.code || ''

    if (code === 'auth/invalid-credential') {
      return { success: false, message: 'Invalid admin email or password.' }
    }

    if (code === 'auth/user-not-found') {
      return { success: false, message: 'No administrator account was found with this email.' }
    }

    if (code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many login attempts. Please try again later.' }
    }

    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return { success: false, message: 'Admin access denied. Firestore permissions are not configured for this account.' }
    }

    return {
      success: false,
      message: error?.message || 'Unable to sign in to the admin dashboard.'
    }
  }
}

export async function logoutAdmin() {
  if (auth) await signOut(auth)
}

export function isAdminAuthenticated(currentUser, userProfile) {
  return Boolean(currentUser && userProfile?.role === 'admin')
}
