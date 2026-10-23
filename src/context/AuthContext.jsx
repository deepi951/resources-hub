import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from '../firebase/firebaseConfig.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUserProfile = useCallback(async (uid) => {
    if (!firebaseConfigured || !db || !uid) {
      setUserProfile(null)
      return null
    }

    try {
      const profileRef = doc(db, 'users', uid)
      const snapshot = await getDoc(profileRef)
      const nextProfile = snapshot.exists() ? snapshot.data() : null
      setUserProfile(nextProfile)
      return nextProfile
    } catch (error) {
      console.error('Unable to fetch user profile', error)
      setUserProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setCurrentUser(null)
      setUserProfile(null)
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await refreshUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [refreshUserProfile])

  const value = { currentUser, userProfile, loading, refreshUserProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
