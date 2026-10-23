import { collection, deleteDoc, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase/firebaseConfig.js'
import { ACTIVE_RETURN_STATUSES, getReturnDeadline, isReturnWindowOpen } from '../utils/returnUtils.js'

const ensureFirebase = () => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to use transaction support.')
}

const addNotificationInTransaction = (transaction, details) => {
  const notificationRef = doc(collection(db, 'notifications'))
  transaction.set(notificationRef, { ...details, read: false, createdAt: serverTimestamp() })
}

const normalizeRows = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))

export const fetchReturnsForUser = async (userId, field) => {
  ensureFirebase()
  const snapshot = await getDocs(query(collection(db, 'returns'), where(field, '==', userId)))
  return normalizeRows(snapshot)
}

export const fetchAllReturns = async () => {
  ensureFirebase()
  const snapshot = await getDocs(collection(db, 'returns'))
  return normalizeRows(snapshot).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export const fetchReportsForUser = async (userId) => {
  ensureFirebase()
  const snapshot = await getDocs(query(collection(db, 'reports'), where('reporterId', '==', userId)))
  return normalizeRows(snapshot)
}

export const fetchAllReports = async () => {
  ensureFirebase()
  const snapshot = await getDocs(collection(db, 'reports'))
  return normalizeRows(snapshot).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export const updateReportStatus = async ({ reportId, status, adminId }) => {
  ensureFirebase()
  const allowed = ['UNDER_REVIEW', 'RESOLVED', 'REJECTED']
  if (!allowed.includes(status)) throw new Error('Choose a valid report status.')
  const reportRef = doc(db, 'reports', reportId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reportRef)
    if (!snapshot.exists()) throw new Error('Report not found.')
    const report = snapshot.data()
    transaction.update(reportRef, { status, reviewedBy: adminId, updatedAt: serverTimestamp() })
    addNotificationInTransaction(transaction, {
      recipientId: report.reporterId,
      type: 'report_status_updated',
      title: 'Report status updated',
      message: `Your report status is now ${status.replace('_', ' ').toLowerCase()}.`,
      reportId,
      productId: report.productId || null,
      buyerId: report.reporterId,
    })
  })
}

export const createIssueReport = async ({ reporterId, reporterName, productId, reportedUserId, orderId, reason, description, buyerId, sellerId, productName, sellerName }) => {
  ensureFirebase()
  const reportRef = doc(collection(db, 'reports'))
  let operation = orderId ? `get /orders/${orderId}` : 'report validation'

  try {
    await runTransaction(db, async (transaction) => {
      let reportedAccountId = reportedUserId || null
      let resolvedProductName = productName || null
      let resolvedSellerId = sellerId || null
      let resolvedSellerName = sellerName || null
      let resolvedBuyerId = buyerId || reporterId || null

      if (orderId) {
        const orderSnapshot = await transaction.get(doc(db, 'orders', orderId))
        if (!orderSnapshot.exists()) throw new Error('The referenced transaction was not found.')
        const order = orderSnapshot.data()
        if (order.buyerId !== reporterId) {
          throw new Error('You can report a purchased product only from your own order.')
        }
        if (productId && order.productId !== productId) throw new Error('The transaction does not match this resource.')
        reportedAccountId = order.sellerId
        resolvedProductName = order.productName || resolvedProductName
        resolvedSellerId = order.sellerId || resolvedSellerId
        resolvedSellerName = order.sellerName || resolvedSellerName
        resolvedBuyerId = order.buyerId || resolvedBuyerId
        if (reportedUserId && reportedUserId !== reportedAccountId) throw new Error('The reported account does not match the transaction.')
        operation = `create /reports/${reportRef.id} after verifying /orders/${orderId}`
      } else if (productId) {
        const productSnapshot = await transaction.get(doc(db, 'products', productId))
        if (!productSnapshot.exists()) throw new Error('The referenced resource was not found.')
        const product = productSnapshot.data()
        reportedAccountId = product.sellerId
        resolvedProductName = product.title || resolvedProductName
        resolvedSellerId = product.sellerId || resolvedSellerId
        resolvedSellerName = product.sellerName || resolvedSellerName
      }

      transaction.set(reportRef, {
        reporterId,
        buyerId: resolvedBuyerId,
        reporterName: reporterName || 'Student',
        productId: productId || null,
        productName: resolvedProductName,
        reportedUserId: reportedAccountId,
        sellerId: resolvedSellerId,
        sellerName: resolvedSellerName,
        orderId: orderId || null,
        reason,
        description: description.trim(),
        status: 'OPEN',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    if (import.meta.env.DEV) {
      console.debug('[ResourceHub][report] report transaction committed', {
        path: `reports/${reportRef.id}`,
        operation: 'create',
        orderId: orderId || null,
      })
    }
    return reportRef.id
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[ResourceHub][report] report transaction failed', {
        path: operation,
        code: error?.code,
        message: error?.message,
      })
    }
    throw error
  }
}

export const requestReturn = async ({ orderId, buyerId, buyerName, buyerPhone, reason, description }) => {
  ensureFirebase()
  const orderRef = doc(db, 'orders', orderId)
  const returnRef = doc(db, 'returns', orderId)
  const sellerNotificationRef = doc(collection(db, 'notifications'))

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, returnSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(returnRef),
    ])
    if (!orderSnapshot.exists()) throw new Error('Transaction not found.')
    const order = orderSnapshot.data()
    if (order.buyerId !== buyerId) throw new Error('You can only request a return for your own transaction.')
    if (!isReturnWindowOpen(order)) throw new Error('Returns are available for seven days after the order is completed.')
    if (returnSnapshot.exists() && ACTIVE_RETURN_STATUSES.includes(String(returnSnapshot.data().status || '').toUpperCase())) {
      throw new Error('An active return request already exists for this transaction.')
    }

    transaction.set(returnRef, {
      orderId,
      buyerId: order.buyerId,
      buyerName: buyerName || order.buyerName || 'Student buyer',
      buyerPhone: String(buyerPhone || '').trim() || null,
      sellerId: order.sellerId,
      sellerName: order.sellerName || 'Student seller',
      sellerPhone: order.sellerPhone || null,
      productId: order.productId,
      productName: order.productName,
      reason,
      description: description.trim(),
      status: 'REQUESTED',
      returnDeadlineAt: getReturnDeadline(order),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.set(sellerNotificationRef, {
      recipientId: order.sellerId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      orderId,
      returnId: orderId,
      type: 'return_requested',
      title: 'Return requested',
      message: `${order.buyerName || 'Buyer'} requested a return for ${order.productName}.`,
      read: false,
      createdAt: serverTimestamp(),
    })
  })
  return orderId
}

export const updateReturnRequest = async ({ orderId, sellerId, action, sellerPhone, sellerName }) => {
  ensureFirebase()
  const actionDetails = {
    CONTACT_REQUESTED: {
      title: 'Seller shared contact details',
      message: 'The seller asked you to contact them directly to coordinate your return.',
      field: 'contactRequestedAt',
    },
    PICKUP_PENDING: {
      title: 'Return pickup arranged',
      message: 'The seller is arranging to collect the returned item. Contact them to coordinate the handoff.',
      field: 'pickupRequestedAt',
    },
    REJECTED: {
      title: 'Return request declined',
      message: 'The seller declined your return request. Contact the seller if you need clarification.',
      field: 'sellerRespondedAt',
    },
  }
  const actionDetail = actionDetails[action]
  if (!actionDetail) throw new Error('Choose a valid return action.')

  const returnRef = doc(db, 'returns', orderId)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request not found.')
    const request = snapshot.data()
    if (request.sellerId !== sellerId) throw new Error('Only the seller can update this return request.')
    if (request.status !== 'REQUESTED') throw new Error('This return request has already been updated.')

    const contactPhone = String(sellerPhone || request.sellerPhone || '').trim()
    if (action !== 'REJECTED' && !contactPhone) {
      throw new Error('Add a phone number to your profile before sharing return contact details.')
    }

    const now = serverTimestamp()
    transaction.update(returnRef, {
      status: action,
      sellerName: sellerName || request.sellerName || 'Student seller',
      sellerPhone: contactPhone || null,
      sellerMessage: actionDetail.message,
      reviewedBy: sellerId,
      [actionDetail.field]: now,
      updatedAt: now,
    })
    addNotificationInTransaction(transaction, {
      recipientId: request.buyerId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      productId: request.productId,
      orderId,
      returnId: orderId,
      type: `return_${action.toLowerCase()}`,
      title: actionDetail.title,
      message: actionDetail.message,
    })
  })
  return true
}

export const decideReturn = async ({ orderId, sellerId, adminId, decision }) => {
  ensureFirebase()
  const allowed = ['APPROVED', 'REJECTED']
  if (!allowed.includes(decision)) throw new Error('Choose approve or reject.')
  const returnRef = doc(db, 'returns', orderId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(returnRef)
    if (!snapshot.exists()) throw new Error('Return request not found.')
    const request = snapshot.data()
    if (sellerId && request.sellerId !== sellerId) throw new Error('Only the seller can review this return.')
    if (!sellerId && !adminId) throw new Error('An authenticated seller or admin is required.')
    if (request.status !== 'REQUESTED') throw new Error('This return request has already been reviewed.')
    transaction.update(returnRef, { status: decision, reviewedBy: adminId || sellerId, updatedAt: serverTimestamp() })
    addNotificationInTransaction(transaction, {
      recipientId: request.buyerId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      productId: request.productId,
      orderId,
      returnId: orderId,
      type: `return_${decision.toLowerCase()}`,
      title: `Return ${decision.toLowerCase()}`,
      message: decision === 'APPROVED' ? 'Your return was approved. Coordinate the item handoff with the seller.' : 'Your return request was rejected.',
    })
  })
  return true
}

export const completeReturn = async ({ orderId, sellerId }) => {
  ensureFirebase()
  const orderRef = doc(db, 'orders', orderId)
  const returnRef = doc(db, 'returns', orderId)
  const buyerNotificationRef = doc(collection(db, 'notifications'))

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, returnSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(returnRef),
    ])
    if (!orderSnapshot.exists() || !returnSnapshot.exists()) throw new Error('Return transaction not found.')
    const order = orderSnapshot.data()
    const returnRequest = returnSnapshot.data()
    if (order.sellerId !== sellerId || returnRequest.sellerId !== sellerId) throw new Error('Only the seller can complete this return.')
    if (!['APPROVED', 'CONTACT_REQUESTED', 'PICKUP_PENDING'].includes(returnRequest.status)) {
      throw new Error('Arrange contact or pickup before confirming receipt.')
    }
    if (order.orderStatus !== 'completed') throw new Error('This transaction is not eligible for return completion.')

    const productRef = doc(db, 'products', order.productId)
    const productSnapshot = await transaction.get(productRef)
    const available = Number(productSnapshot.data()?.availableQuantity ?? productSnapshot.data()?.quantity ?? 0)
    transaction.update(returnRef, { status: 'RETURNED', returnedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    transaction.update(orderRef, { orderStatus: 'returned', returnedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    if (productSnapshot.exists()) {
      const quantity = available + Number(order.quantity || 1)
      transaction.update(productRef, { availableQuantity: quantity, status: 'active', updatedAt: serverTimestamp() })
    }
    transaction.set(buyerNotificationRef, {
      recipientId: order.buyerId,
      buyerId: order.buyerId,
      sellerId,
      productId: order.productId,
      orderId,
      returnId: orderId,
      type: 'return_completed',
      title: 'Return completed',
      message: `The seller confirmed receipt of ${order.productName}; the return is complete.`,
      read: false,
      createdAt: serverTimestamp(),
    })
  })
}

export const submitOrderReview = async ({ orderId, buyerId, rating, comment }) => {
  ensureFirebase()
  const orderRef = doc(db, 'orders', orderId)
  const reviewRef = doc(db, 'reviews', orderId)
  const sellerNotificationRef = doc(collection(db, 'notifications'))

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, reviewSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(reviewRef),
    ])
    if (!orderSnapshot.exists()) throw new Error('Transaction not found.')
    const order = orderSnapshot.data()
    if (order.buyerId !== buyerId) throw new Error('You can only review your own purchase.')
    if (order.orderStatus !== 'completed') throw new Error('Feedback is available after the transaction is completed.')
    if (reviewSnapshot.exists()) throw new Error('Feedback has already been submitted for this transaction.')

    transaction.set(reviewRef, {
      transactionId: orderId,
      reviewerId: buyerId,
      reviewerName: order.buyerName || 'Student',
      resourceId: order.productId,
      sellerId: order.sellerId,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: serverTimestamp(),
    })
    transaction.set(sellerNotificationRef, {
      recipientId: order.sellerId,
      buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      orderId,
      type: 'feedback_received',
      title: 'Feedback received',
      message: `${order.buyerName || 'A buyer'} left feedback for ${order.productName}.`,
      read: false,
      createdAt: serverTimestamp(),
    })
  })
}

export const fetchReviewsForResource = async (productId) => {
  ensureFirebase()
  const snapshot = await getDocs(query(collection(db, 'reviews'), where('resourceId', '==', productId)))
  return normalizeRows(snapshot).sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0))
}

export const fetchReviewsByBuyer = async (buyerId) => {
  ensureFirebase()
  const snapshot = await getDocs(query(collection(db, 'reviews'), where('reviewerId', '==', buyerId)))
  return normalizeRows(snapshot)
}

export const canSellerCompleteOrder = ({ orderStatus, paymentStatus, paymentMethod }) => {
  const normalizedStatus = String(orderStatus || '').toLowerCase()
  const normalizedPaymentStatus = String(paymentStatus || '').toLowerCase()
  const normalizedMethod = String(paymentMethod || '').toLowerCase()

  if (!['confirmed', 'confirmed_cod', 'handover_pending'].includes(normalizedStatus)) return false
  if (normalizedMethod === 'cod') return true
  if (normalizedStatus === 'handover_pending') return normalizedPaymentStatus === 'paid'
  return normalizedPaymentStatus === 'paid'
}

export const completeOrder = async ({ orderId, sellerId }) => {
  ensureFirebase()
  const orderRef = doc(db, 'orders', orderId)
  const paymentRef = doc(db, 'payments', orderId)
  const buyerNotificationRef = doc(collection(db, 'notifications'))
  let guardRefToRelease = null

  await runTransaction(db, async (transaction) => {
    const [snapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ])
    if (!snapshot.exists()) throw new Error('Order not found.')
    const order = snapshot.data()
    if (order.sellerId !== sellerId) throw new Error('Only the seller can complete this transaction.')
    if (!canSellerCompleteOrder({ orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod })) {
      throw new Error('This order is not ready to complete.')
    }
    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && order.orderStatus !== 'handover_pending') {
      throw new Error('Payment must be successful before handover completion.')
    }

    const guardRef = doc(db, 'purchaseGuards', order.guardId || `${order.buyerId}_${order.productId}`)
  guardRefToRelease = guardRef
    const now = serverTimestamp()
    if (order.paymentMethod === 'cod') {
      if (paymentSnapshot.exists()) throw new Error('A payment record already exists for this cash-on-delivery order.')
      transaction.set(paymentRef, {
        orderId,
        transactionId: orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        productId: order.productId,
        amount: Number(order.totalAmount),
        method: 'cash_on_delivery',
        status: 'success',
        demo: false,
        confirmedBy: sellerId,
        createdAt: now,
        updatedAt: now,
      })
    }
    transaction.update(orderRef, {
      orderStatus: 'completed',
      ...(order.paymentMethod === 'cod' ? { paymentStatus: 'paid', paidAt: now } : { paymentStatus: order.paymentStatus || 'paid' }),
      completedAt: now,
      updatedAt: now,
    })
    transaction.set(buyerNotificationRef, {
      recipientId: order.buyerId,
      buyerId: order.buyerId,
      sellerId,
      productId: order.productId,
      orderId,
      type: 'transaction_completed',
      title: 'Transaction completed',
      message: `${order.productName} is marked complete. You can now leave feedback or request a return.`,
      read: false,
      createdAt: serverTimestamp(),
    })
  })

  if (guardRefToRelease) {
    try {
      await deleteDoc(guardRefToRelease)
    } catch (cleanupError) {
      if (import.meta.env.DEV) {
        console.warn('Unable to release purchase guard after handover completion:', {
          orderId,
          code: cleanupError?.code || null,
          message: cleanupError?.message || 'Unknown Firestore error.',
        })
      }
    }
  }
}
