import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  runTransaction,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase/firebaseConfig.js'
import { reserveOrderDisplayNumber } from './orderNumberService.js'

const getCollection = (collectionName) => {
  if (!firebaseConfigured || !db) {
    return null
  }

  return collection(db, collectionName)
}

const sortByNewestFirst = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

const getRequestById = async (requestId) => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to read a purchase request.')

  const requestRef = doc(db, 'purchaseRequests', requestId)
  const snapshot = await getDoc(requestRef)
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export const createPurchaseRequest = async ({
  buyerId,
  buyerName,
  buyerEmail,
  sellerId,
  sellerName,
  productId,
  quantity,
  unitPrice,
  requestedPaymentMethod,
}) => {
  const purchaseRequestsCollection = getCollection('purchaseRequests')
  if (!purchaseRequestsCollection || !firebaseConfigured || !db) {
    throw new Error('Firebase is required to create a purchase request.')
  }

  const requestRef = doc(purchaseRequestsCollection)
  const guardId = `${buyerId}_${productId}`
  const guardRef = doc(db, 'purchaseGuards', guardId)
  const productRef = doc(db, 'products', productId)
  const notificationRef = doc(collection(db, 'notifications'))
  const safeQuantity = Number(quantity || 1)
  const safePaymentMethod = String(requestedPaymentMethod || 'cod').toLowerCase()

  await runTransaction(db, async (transaction) => {
    const guardSnapshot = await transaction.get(guardRef)
    const productSnapshot = await transaction.get(productRef)
    if (guardSnapshot.exists()) throw new Error('You already have an active purchase for this resource.')
    if (!productSnapshot.exists()) throw new Error('This resource is no longer available.')

    const product = productSnapshot.data()
    if (product.sellerId === buyerId) throw new Error('You cannot buy your own listing.')
    if (product.sellerId !== sellerId) throw new Error('The seller details changed. Reload this resource and try again.')
    if (Number(product.availableQuantity ?? product.quantity ?? 0) < safeQuantity || product.status === 'sold_out') {
      throw new Error('This resource is no longer available in the requested quantity.')
    }
    if (Number(product.price) !== Number(unitPrice)) throw new Error('The price changed. Reload this resource before continuing.')

    const now = serverTimestamp()
    transaction.set(requestRef, {
      buyerId,
      buyerName,
      buyerEmail,
      sellerId,
      sellerName,
      productId,
      productName: product.title,
      quantity: safeQuantity,
      unitPrice: Number(product.price),
      totalAmount: Number(product.price) * safeQuantity,
      requestedPaymentMethod: safePaymentMethod,
      guardId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    transaction.set(guardRef, { buyerId, sellerId, productId, requestId: requestRef.id, orderId: null, createdAt: now })
    transaction.set(notificationRef, {
      recipientId: sellerId,
      type: 'new_purchase_request',
      title: 'New purchase request',
      message: `${buyerName} requested to buy ${product.title} for ₹${Number(product.price) * safeQuantity}.`,
      requestId: requestRef.id,
      productId,
      buyerId,
      sellerId,
      read: false,
      createdAt: now,
    })
  })

  return requestRef.id
}

export const fetchPurchaseRequestsByBuyer = async (buyerId) => {
  const requestsCollection = getCollection('purchaseRequests')
  if (!requestsCollection || !firebaseConfigured || !db) throw new Error('Firebase is required to read purchase requests.')

  const q = query(collection(db, 'purchaseRequests'), where('buyerId', '==', buyerId))
  const snapshot = await getDocs(q)
  return sortByNewestFirst(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
}

export const fetchPurchaseRequestsBySeller = async (sellerId) => {
  const requestsCollection = getCollection('purchaseRequests')
  if (!requestsCollection || !firebaseConfigured || !db) throw new Error('Firebase is required to read purchase requests.')

  const q = query(collection(db, 'purchaseRequests'), where('sellerId', '==', sellerId))
  const snapshot = await getDocs(q)
  return sortByNewestFirst(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
}

export const rejectPurchaseRequest = async (requestId, sellerId) => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to reject a request.')
  const request = await getRequestById(requestId)
  if (!request) {
    throw new Error('Purchase request not found.')
  }

  if (request.sellerId !== sellerId) {
    throw new Error('You can only reject requests for your own products.')
  }

  if (request.status !== 'pending') {
    throw new Error('This purchase request is no longer pending.')
  }

  const requestRef = doc(db, 'purchaseRequests', requestId)
  const guardRef = doc(db, 'purchaseGuards', request.guardId || `${request.buyerId}_${request.productId}`)
  const notificationRef = doc(collection(db, 'notifications'))
  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef)
    if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending') throw new Error('This request is no longer pending.')
    transaction.update(requestRef, { status: 'rejected', updatedAt: serverTimestamp() })
    transaction.delete(guardRef)
    transaction.set(notificationRef, {
      recipientId: request.buyerId,
      type: 'request_rejected',
      title: 'Purchase request rejected',
      message: 'Your purchase request has been rejected by the seller.',
      requestId,
      productId: request.productId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      read: false,
      createdAt: serverTimestamp(),
    })
  })

  return { id: requestId }
}

export const acceptPurchaseRequest = async (requestId, sellerId) => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to accept a request.')
  const request = await getRequestById(requestId)
  if (!request) {
    throw new Error('Purchase request not found.')
  }

  if (request.sellerId !== sellerId) {
    throw new Error('You can only accept requests for your own products.')
  }

  if (request.status !== 'pending') {
    throw new Error('This request is no longer pending.')
  }

  const productRef = doc(db, 'products', request.productId)
  const requestRef = doc(db, 'purchaseRequests', requestId)
  const guardRef = doc(db, 'purchaseGuards', request.guardId || `${request.buyerId}_${request.productId}`)
  const sellerProfileRef = doc(db, 'users', sellerId)
  const notificationRef = doc(collection(db, 'notifications'))
  const orderDocRef = doc(collection(db, 'orders'))
  const orderYear = String(new Date().getUTCFullYear())

  let createdOrderId = null

  try {
    const sellerRequestsSnapshot = await getDocs(query(
      collection(db, 'purchaseRequests'),
      where('sellerId', '==', sellerId),
    ))
    const competingRequestRefs = sellerRequestsSnapshot.docs
      .filter((requestSnapshot) => {
        const competingRequest = requestSnapshot.data()
        return requestSnapshot.id !== requestId
          && competingRequest.productId === request.productId
          && competingRequest.status === 'pending'
      })
      .map((requestSnapshot) => requestSnapshot.ref)

    await runTransaction(db, async (transaction) => {
      const [requestSnapshot, productSnapshot, guardSnapshot, sellerProfileSnapshot] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(productRef),
        transaction.get(guardRef),
        transaction.get(sellerProfileRef),
      ])
      if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending') {
        throw new Error('This request is no longer pending.')
      }
      if (!guardSnapshot.exists() || guardSnapshot.data().requestId !== requestId) {
        throw new Error('This purchase request is no longer active.')
      }
      if (!productSnapshot.exists()) {
        throw new Error('Product no longer exists.')
      }

      const product = productSnapshot.data()
      const sellerProfile = sellerProfileSnapshot.exists() ? sellerProfileSnapshot.data() : {}
      const requestedQuantity = Number(request.quantity || 1)
      const availableQuantity = Number(product.availableQuantity ?? product.quantity ?? 0)
      const sellerUpiId = product.sellerUpiId || product.upiNumber || null

      if (availableQuantity < requestedQuantity) {
        throw new Error('Requested quantity exceeds the current available stock.')
      }

      const nextAvailable = Math.max(availableQuantity - requestedQuantity, 0)
      const nextStatus = nextAvailable <= 0 ? 'sold_out' : 'active'
      const competingRequestSnapshots = nextAvailable === 0
        ? await Promise.all(competingRequestRefs.map((requestRef) => transaction.get(requestRef)))
        : []
      const orderNumber = await reserveOrderDisplayNumber(transaction, orderDocRef, orderYear)

      transaction.update(productRef, {
        availableQuantity: nextAvailable,
        quantity: Number(product.quantity ?? availableQuantity),
        status: nextStatus,
        updatedAt: serverTimestamp(),
      })

      transaction.update(requestRef, {
        status: 'accepted',
        orderId: orderDocRef.id,
        updatedAt: serverTimestamp(),
      })

      const paymentMethod = String(request.requestedPaymentMethod || 'cod').toLowerCase()
      const orderPayload = {
        buyerId: request.buyerId,
        buyerName: request.buyerName,
        buyerEmail: request.buyerEmail,
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        sellerPhone: sellerProfile.phone || null,
        productId: request.productId,
        productName: request.productName,
        quantity: Number(request.quantity || 1),
        unitPrice: Number(request.unitPrice || 0),
        totalAmount: Number(request.totalAmount || 0),
        paymentMethod,
        sellerUpiId,
        paymentStatus: paymentMethod === 'upi' ? 'awaiting_payment' : 'pending',
        orderStatus: paymentMethod === 'upi' ? 'awaiting_payment' : 'confirmed_cod',
        ...orderNumber,
        requestId,
        guardId: guardRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paidAt: null,
        confirmedAt: null,
      }

      transaction.set(orderDocRef, orderPayload)
      transaction.update(guardRef, { orderId: orderDocRef.id, updatedAt: serverTimestamp() })
      transaction.set(notificationRef, {
        recipientId: request.buyerId,
        type: 'purchase_accepted',
        title: 'Your purchase request was accepted',
        message: request.requestedPaymentMethod === 'upi'
          ? `Seller accepted ${request.productName}. Continue to demo UPI payment when ready.`
          : `Seller accepted your COD request for ${request.productName}.`,
        requestId,
        productId: request.productId,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        orderId: orderDocRef.id,
        read: false,
        createdAt: serverTimestamp(),
      })

      competingRequestSnapshots
        .filter((pendingRequest) => pendingRequest.exists() && pendingRequest.data().status === 'pending')
        .forEach((pendingRequest) => {
          const competingRequest = pendingRequest.data()
          const competingGuardRef = doc(db, 'purchaseGuards', competingRequest.guardId || `${competingRequest.buyerId}_${competingRequest.productId}`)
          const soldOutNotificationRef = doc(collection(db, 'notifications'))

          transaction.update(pendingRequest.ref, { status: 'rejected', updatedAt: serverTimestamp() })
          transaction.delete(competingGuardRef)
          transaction.set(soldOutNotificationRef, {
            recipientId: competingRequest.buyerId,
            type: 'request_sold_out',
            title: 'Resource sold out',
            message: `${request.productName} was sold to another buyer before your request could be accepted.`,
            requestId: pendingRequest.id,
            productId: request.productId,
            buyerId: competingRequest.buyerId,
            sellerId: request.sellerId,
            read: false,
            createdAt: serverTimestamp(),
          })
        })
      createdOrderId = orderDocRef.id
    })
  } catch (error) {
    console.error('acceptPurchaseRequest failed:', error)
    throw error
  }

  return { orderId: createdOrderId }
}

export const fetchOrdersByBuyer = async (buyerId) => {
  const ordersCollection = getCollection('orders')
  if (!ordersCollection || !firebaseConfigured || !db) throw new Error('Firebase is required to read transactions.')

  const q = query(collection(db, 'orders'), where('buyerId', '==', buyerId))
  const snapshot = await getDocs(q)
  return sortByNewestFirst(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
}

export const fetchOrdersBySeller = async (sellerId) => {
  const ordersCollection = getCollection('orders')
  if (!ordersCollection || !firebaseConfigured || !db) throw new Error('Firebase is required to read transactions.')

  const q = query(collection(db, 'orders'), where('sellerId', '==', sellerId))
  const snapshot = await getDocs(q)
  return sortByNewestFirst(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
}

export const fetchNotificationsByUser = async (userId) => {
  const notificationsCollection = getCollection('notifications')
  if (!notificationsCollection || !firebaseConfigured || !db) throw new Error('Firebase is required to read notifications.')

  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId))
  const snapshot = await getDocs(q)
  return sortByNewestFirst(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
}

export const markNotificationRead = async (notificationId) => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to update a notification.')

  const notificationRef = doc(db, 'notifications', notificationId)
  await updateDoc(notificationRef, {
    read: true,
    updatedAt: serverTimestamp(),
  })
}
