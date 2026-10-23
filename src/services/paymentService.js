import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase/firebaseConfig.js'

export const getMerchantUpiId = () => String(import.meta.env.VITE_MERCHANT_UPI_ID || '').trim()

const requireFirestore = () => {
  if (!firebaseConfigured || !db) throw new Error('Firebase must be configured to process a payment.')
}

export const getPaymentMethodLabel = (paymentMethod) => {
  const method = String(paymentMethod || '').trim().toLowerCase()
  if (method === 'upi') return 'UPI'
  if (method === 'both') return 'Cash on Delivery or UPI'
  return 'Cash on Delivery'
}

export const initializeDemoPayment = async ({ orderId, buyerId }) => {
  requireFirestore()
  const orderRef = doc(db, 'orders', orderId)
  const paymentRef = doc(db, 'payments', orderId)
  let paymentData = null

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ])
    if (!orderSnapshot.exists()) throw new Error('Order not found.')
    const order = orderSnapshot.data()
    if (order.buyerId !== buyerId) throw new Error('You can only pay for your own order.')
    if (!['upi', 'both'].includes(order.paymentMethod)) throw new Error('This order does not support UPI payment.')

    if (paymentSnapshot.exists()) {
      paymentData = { id: paymentSnapshot.id, ...paymentSnapshot.data() }
      return
    }

    if (order.orderStatus !== 'awaiting_payment') throw new Error('This order is not awaiting payment.')

    paymentData = {
      id: orderId,
      orderId,
      transactionId: orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      amount: Number(order.totalAmount),
      method: 'upi_demo',
      status: 'pending',
      demo: true,
      createdAt: new Date().toISOString(),
    }
    transaction.set(paymentRef, { ...paymentData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })

  return paymentData
}

export const markPaymentClaimed = async ({ orderId, buyerId }) => {
  requireFirestore()

  const orderRef = doc(db, 'orders', orderId)
  const paymentRef = doc(db, 'payments', orderId)

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ])

    if (!orderSnapshot.exists()) throw new Error('Order not found.')
    const order = orderSnapshot.data()
    if (order.buyerId !== buyerId) throw new Error('You can only claim payment for your own order.')
    if (!['upi', 'both'].includes(order.paymentMethod)) throw new Error('This order does not support UPI payment.')
    if (order.orderStatus !== 'awaiting_payment') throw new Error('This order is not awaiting payment.')

    const now = serverTimestamp()
    const paymentPayload = {
      orderId,
      transactionId: orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      amount: Number(order.totalAmount),
      method: 'upi_demo',
      status: 'buyer_claimed',
      demo: true,
      updatedAt: now,
      ...(paymentSnapshot.exists() ? {} : { createdAt: now }),
    }

    if (paymentSnapshot.exists()) {
      transaction.update(paymentRef, paymentPayload)
    } else {
      transaction.set(paymentRef, paymentPayload)
    }

    transaction.update(orderRef, {
      paymentStatus: 'buyer_claimed',
      orderStatus: 'awaiting_seller_confirmation',
      paymentClaimedAt: now,
      updatedAt: now,
    })

    transaction.set(doc(collection(db, 'notifications')), {
      recipientId: order.sellerId,
      type: 'payment_claimed',
      title: 'Payment claimed',
      message: `${order.buyerName || 'Buyer'} marked the payment as sent for ${order.productName}. Please confirm the payment.`,
      orderId,
      productId: order.productId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      read: false,
      createdAt: now,
    })
  })

  return { success: true }
}

export const confirmSellerPayment = async ({ orderId, sellerId }) => {
  requireFirestore()

  const orderRef = doc(db, 'orders', orderId)
  const paymentRef = doc(db, 'payments', orderId)

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ])

    if (!orderSnapshot.exists()) throw new Error('Order not found.')
    const order = orderSnapshot.data()
    if (order.sellerId !== sellerId) throw new Error('Only the seller can confirm payment.')
    if (order.orderStatus !== 'awaiting_seller_confirmation' || order.paymentStatus !== 'buyer_claimed') {
      throw new Error('This payment has not been claimed by the buyer yet.')
    }

    const now = serverTimestamp()
    transaction.update(orderRef, {
      paymentStatus: 'paid',
      orderStatus: 'handover_pending',
      paidAt: now,
      updatedAt: now,
    })

    if (paymentSnapshot.exists()) {
      transaction.update(paymentRef, {
        status: 'paid',
        confirmedBy: sellerId,
        updatedAt: now,
      })
    }

    transaction.set(doc(collection(db, 'notifications')), {
      recipientId: order.buyerId,
      type: 'payment_confirmed',
      title: 'Payment confirmed',
      message: `The seller confirmed payment for ${order.productName}. Meet for handover and complete the transaction.`,
      orderId,
      productId: order.productId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      read: false,
      createdAt: now,
    })
  })

  return { success: true }
}

export const fetchPaymentForOrder = async (orderId, buyerId) => {
  requireFirestore()
  const orderSnapshot = await getDoc(doc(db, 'orders', orderId))
  if (!orderSnapshot.exists()) throw new Error('Order not found.')
  const order = orderSnapshot.data()
  if (order.buyerId !== buyerId) throw new Error('You can only view payment for your own order.')

  const paymentSnapshot = await getDoc(doc(db, 'payments', orderId))
  return {
    order: { id: orderSnapshot.id, ...order },
    payment: paymentSnapshot.exists() ? { id: paymentSnapshot.id, ...paymentSnapshot.data() } : null,
  }
}

export const recordDemoPaymentResult = async ({ orderId, buyerId, result }) => {
  requireFirestore()
  const allowedResults = ['pending', 'success', 'failed', 'cancelled']
  const normalizedResult = String(result || '').toLowerCase()
  if (!allowedResults.includes(normalizedResult)) throw new Error('Choose a valid demo payment result.')

  const orderRef = doc(db, 'orders', orderId)
  const paymentRef = doc(db, 'payments', orderId)
  const buyerNotificationRef = doc(collection(db, 'notifications'))
  const sellerNotificationRef = doc(collection(db, 'notifications'))

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ])
    if (!orderSnapshot.exists()) throw new Error('Order not found.')
    const order = orderSnapshot.data()
    if (order.buyerId !== buyerId) throw new Error('You can only pay for your own order.')
    if (!['upi', 'both'].includes(order.paymentMethod)) throw new Error('This order does not support UPI payment.')
    if (['completed', 'cancelled', 'returned'].includes(order.orderStatus)) throw new Error('This order is no longer payable.')
    if (order.orderStatus !== 'awaiting_payment' && order.paymentStatus !== 'paid') throw new Error('This order is not awaiting payment.')
    if (paymentSnapshot.exists() && paymentSnapshot.data().status === 'success') return

    const now = serverTimestamp()
    const paymentData = {
      orderId,
      transactionId: orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      amount: Number(order.totalAmount),
      method: 'upi_demo',
      status: normalizedResult,
      demo: true,
      updatedAt: now,
      ...(paymentSnapshot.exists() ? {} : { createdAt: now }),
    }
    if (paymentSnapshot.exists()) transaction.update(paymentRef, paymentData)
    else transaction.set(paymentRef, paymentData)

    if (normalizedResult === 'success') {
      transaction.update(orderRef, {
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        paidAt: now,
        updatedAt: now,
      })
      transaction.set(sellerNotificationRef, {
        recipientId: order.sellerId,
        type: 'demo_payment_success',
        title: 'Demo payment recorded',
        message: `${order.buyerName || 'Buyer'} recorded a demo UPI payment of Rs ${Number(order.totalAmount)} for ${order.productName}. This is not bank verification.`,
        orderId,
        productId: order.productId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        read: false,
        createdAt: now,
      })
      transaction.set(buyerNotificationRef, {
        recipientId: order.buyerId,
        type: 'demo_payment_success',
        title: 'Demo payment recorded',
        message: `Your demo UPI payment was recorded for ${order.productName}. Arrange handover with the seller.`,
        orderId,
        productId: order.productId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        read: false,
        createdAt: now,
      })
    } else if (normalizedResult !== 'pending') {
      transaction.set(buyerNotificationRef, {
        recipientId: order.buyerId,
        type: `demo_payment_${normalizedResult}`,
        title: `Demo payment ${normalizedResult}`,
        message: `Your demo payment for ${order.productName} was ${normalizedResult}. You can retry while the order is awaiting payment.`,
        orderId,
        productId: order.productId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        read: false,
        createdAt: now,
      })
    }
  })

  return { success: true, result: normalizedResult }
}
