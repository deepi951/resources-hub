import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

export async function getAdminProducts() {
  if (!firebaseConfigured || !db) {
    return []
  }

  const snapshot = await getDocs(collection(db, 'products'))
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}
