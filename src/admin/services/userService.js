import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

export async function getRecentUsers() {
  if (!firebaseConfigured || !db) {
    return []
  }

  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((user) => user.role !== 'admin')
}
