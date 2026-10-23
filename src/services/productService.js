import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase/firebaseConfig.js'
import { normalizeProductSubcategory } from '../data/resourcehubCatalog.js'

const PRODUCT_STORAGE_KEY = 'resourcehub_products'

const getProductCache = () => {
  const memoryStore = {
    getItem: (key) => (key === PRODUCT_STORAGE_KEY ? globalThis.__resourcehubProductsStore || '[]' : null),
    setItem: (key, value) => {
      if (key === PRODUCT_STORAGE_KEY) globalThis.__resourcehubProductsStore = value
    },
    removeItem: (key) => {
      if (key === PRODUCT_STORAGE_KEY) globalThis.__resourcehubProductsStore = '[]'
    },
    clear: () => {
      globalThis.__resourcehubProductsStore = '[]'
    },
  }

  try {
    if (globalThis && typeof globalThis.__resourcehubProductsStore === 'undefined') {
      globalThis.__resourcehubProductsStore = '[]'
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(PRODUCT_STORAGE_KEY, window.localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]')
        return window.localStorage
      } catch {
        return memoryStore
      }
    }

    return memoryStore
  } catch {
    return memoryStore
  }
}

const readStoredProducts = () => {
  const storage = getProductCache()

  try {
    const storedProducts = storage.getItem(PRODUCT_STORAGE_KEY)
    if (!storedProducts) return []

    const parsed = JSON.parse(storedProducts)
    if (!Array.isArray(parsed) || parsed.length === 0) return []

    return parsed
  } catch {
    return []
  }
}

const normalizePaymentMethod = (product = {}) => {
  const method = String(product.paymentMethod || product.payment || 'cod').trim().toLowerCase()
  return ['cod', 'upi', 'both'].includes(method) ? method : 'cod'
}

const normalizeQuantity = (product = {}) => {
  const rawQuantity = Number(product.quantity ?? product.availableQuantity ?? 1)
  const rawAvailable = Number(product.availableQuantity ?? product.quantity ?? 1)

  const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 0
  const availableQuantity = Number.isFinite(rawAvailable) && rawAvailable > 0 ? rawAvailable : 0

  return {
    quantity,
    availableQuantity,
  }
}

const normalizeStatus = (product = {}) => {
  const status = product.status || 'Approved'
  const normalizedStatus = status === 'Pending Approval' ? 'Approved' : status
  const { availableQuantity } = normalizeQuantity(product)

  if (normalizedStatus !== 'sold_out' && availableQuantity <= 0) {
    return {
      ...product,
      status: 'sold_out',
      availableQuantity: 0,
    }
  }

  return {
    ...product,
    status: normalizedStatus,
  }
}

const getProductsCollection = () => {
  if (!firebaseConfigured || !db) {
    return null
  }

  return collection(db, 'products')
}

export const createProduct = async (productData) => {
  const normalizedProduct = normalizeProductSubcategory(productData)
  const paymentMethod = normalizePaymentMethod(normalizedProduct)
  const { quantity, availableQuantity } = normalizeQuantity(normalizedProduct)
  const productPayload = {
    ...normalizedProduct,
    paymentMethod,
    upiNumber: normalizedProduct.upiNumber || normalizedProduct.sellerUpiId || null,
    sellerUpiId: normalizedProduct.sellerUpiId || normalizedProduct.upiNumber || null,
    quantity,
    availableQuantity: availableQuantity || quantity,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: availableQuantity > 0 ? 'active' : 'sold_out',
    views: 0,
    favoritesCount: 0,
  }

  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    throw new Error('Firebase Firestore is required to publish a listing.')
  }

  const productRef = await addDoc(productsCollection, productPayload)
  return productRef.id
}

export const fetchProducts = async () => {
  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    const products = readStoredProducts()
      .map((product) => normalizeProductSubcategory(normalizeStatus(product)))
      .filter((product) => product.status !== 'sold_out')
    return products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }

  const q = query(productsCollection, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((docSnap) => {
      const product = { id: docSnap.id, ...docSnap.data() }
      return normalizeProductSubcategory(normalizeStatus(product))
    })
    .filter((product) => product.status !== 'sold_out')
}

export const fetchProductById = async (productId) => {
  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    const product = readStoredProducts().find((item) => item.id === productId)
    if (!product) return null
    return normalizeProductSubcategory(normalizeStatus(product))
  }

  const productRef = doc(db, 'products', productId)
  const snapshot = await getDoc(productRef)

  if (!snapshot.exists()) return null
  const product = { id: snapshot.id, ...snapshot.data() }
  return normalizeProductSubcategory(normalizeStatus(product))
}

export const updateProduct = async (productId, updates) => {
  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    throw new Error('Firebase Firestore is required to update a listing.')
  }

  const productRef = doc(db, 'products', productId)
  await updateDoc(productRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export const deleteProduct = async (productId) => {
  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    throw new Error('Firebase Firestore is required to remove a listing.')
  }

  const productRef = doc(db, 'products', productId)
  await deleteDoc(productRef)
}

export const fetchProductsBySeller = async (sellerId) => {
  const productsCollection = getProductsCollection()
  if (!productsCollection) {
    const products = readStoredProducts()
      .filter((product) => product.sellerId === sellerId)
      .map((product) => normalizeProductSubcategory(normalizeStatus(product)))
    return products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }

  try {
    const q = query(collection(db, 'products'), where('sellerId', '==', sellerId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
      const product = { id: docSnap.id, ...docSnap.data() }
      return normalizeProductSubcategory(normalizeStatus(product))
    })
  } catch (error) {
    console.error('Dashboard product query failed:', error)
    console.error('Firebase error code:', error?.code)
    console.error('Firebase error message:', error?.message)

    if (error?.code === 'permission-denied') {
      throw new Error('Firebase permission denied. Please allow authenticated users to read products in Firestore rules.')
    }

    throw error
  }
}
