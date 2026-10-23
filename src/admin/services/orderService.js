import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

export async function getRecentOrders() {
  if (!firebaseConfigured || !db) {
    return []
  }

  const snapshot = await getDocs(collection(db, 'orders'))
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}
