import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || '',
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: viteEnv.VITE_FIREBASE_APP_ID || '',
}

const hasRequiredFirebaseConfig = Object.values(firebaseConfig).every(Boolean)

if (!hasRequiredFirebaseConfig) {
  console.warn('Firebase environment variables are missing. Add a .env file with your project credentials before using auth, Firestore, or Storage.')
}

let app = null
let auth = null
let db = null
let functions = null

if (hasRequiredFirebaseConfig) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  setPersistence(auth, browserLocalPersistence).catch(() => {})
  db = getFirestore(app)
  functions = getFunctions(app, 'us-central1')
}

const developmentDebugState = {
  projectId: app?.options?.projectId || null,
  get authUid() {
    return auth?.currentUser?.uid || null
  },
  get authEmail() {
    return auth?.currentUser?.email || null
  },
  getUserProfile: async () => {
    if (!db || !auth?.currentUser?.uid) {
      return null
    }

    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const snapshot = await getDoc(doc(db, 'users', auth.currentUser.uid))
      return snapshot.exists() ? snapshot.data() : null
    } catch (error) {
      console.error('ResourceHub debug getUserProfile failed:', error)
      return null
    }
  },
  checkOrderRead: async (orderId) => {
    if (!db || !auth?.currentUser?.uid || !orderId) {
      return { ok: false, path: `orders/${orderId || ''}`, method: 'getDoc', code: 'missing-auth-or-order-id' }
    }

    const { doc, getDoc } = await import('firebase/firestore')
    try {
      const snapshot = await getDoc(doc(db, 'orders', orderId))
      return {
        ok: true,
        path: `orders/${orderId}`,
        method: 'getDoc',
        authUid: auth.currentUser.uid,
        exists: snapshot.exists(),
        order: snapshot.exists() ? snapshot.data() : null,
      }
    } catch (error) {
      return {
        ok: false,
        path: `orders/${orderId}`,
        method: 'getDoc',
        authUid: auth.currentUser.uid,
        code: error?.code || null,
        message: error?.message || 'Order read failed.',
      }
    }
  },
  checkProject: async () => {
    const userProfile = await developmentDebugState.getUserProfile()

    return {
      projectId: app?.options?.projectId || null,
      authUid: auth?.currentUser?.uid || null,
      authEmail: auth?.currentUser?.email || null,
      userProfile,
    }
  },
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__RESOURCEHUB_DEBUG__ = developmentDebugState
}

export const firebaseConfigured = hasRequiredFirebaseConfig
export { app, auth, db, functions }

export default app
