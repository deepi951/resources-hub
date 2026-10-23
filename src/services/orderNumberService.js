import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase/firebaseConfig.js'

const displayNumberPattern = /^RH-(\d{4})-(\d+)$/

const requireFirebase = () => {
  if (!firebaseConfigured || !db) throw new Error('Firebase is required to assign order numbers.')
}

export const getOrderYear = (order) => {
  const createdAt = order?.createdAt
  const date = createdAt && typeof createdAt.toDate === 'function'
    ? createdAt.toDate()
    : new Date(createdAt || '')
  return String(Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear())
}

export const getOrderNumberSequence = (displayOrderNumber, year) => {
  const match = displayNumberPattern.exec(String(displayOrderNumber || ''))
  return match && match[1] === String(year) ? Number(match[2]) : 0
}

export const formatOrderDisplayNumber = (year, number) => `RH-${String(year)}-${Number(number)}`

export const reserveOrderDisplayNumber = async (transaction, orderRef, year, minimumNumber = 0) => {
  requireFirebase()
  const normalizedYear = String(year)
  const counterRef = doc(db, 'systemCounters', `orderNumbers-${normalizedYear}`)
  const counterSnapshot = await transaction.get(counterRef)
  const lastNumber = counterSnapshot.exists() ? Number(counterSnapshot.data().lastNumber || 0) : 0
  const nextNumber = Math.max(lastNumber, Number(minimumNumber) || 0) + 1
  const displayOrderNumber = formatOrderDisplayNumber(normalizedYear, nextNumber)

  transaction.set(counterRef, {
    year: normalizedYear,
    lastNumber: nextNumber,
    lastOrderId: orderRef.id,
    lastDisplayOrderNumber: displayOrderNumber,
    updatedAt: serverTimestamp(),
  })

  return { displayOrderNumber, displayOrderYear: normalizedYear }
}

export const ensureLegacyOrderDisplayNumbers = async (orders) => {
  requireFirebase()
  const highestByYear = new Map()
  const assignedById = new Map()

  for (const order of orders) {
    const year = getOrderYear(order)
    const sequence = getOrderNumberSequence(order.displayOrderNumber, year)
    if (sequence > 0) highestByYear.set(year, Math.max(highestByYear.get(year) || 0, sequence))
    if (order.displayOrderNumber) assignedById.set(order.id, order)
  }

  const missingOrders = orders
    .filter((order) => !order.displayOrderNumber)
    .sort((first, second) => {
      const firstDate = first.createdAt?.toDate ? first.createdAt.toDate().getTime() : new Date(first.createdAt || 0).getTime()
      const secondDate = second.createdAt?.toDate ? second.createdAt.toDate().getTime() : new Date(second.createdAt || 0).getTime()
      return firstDate - secondDate || String(first.id).localeCompare(String(second.id))
    })

  for (const order of missingOrders) {
    const orderRef = doc(db, 'orders', order.id)
    const year = getOrderYear(order)
    let assignedOrder = null

    await runTransaction(db, async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef)
      if (!orderSnapshot.exists()) return
      const currentOrder = { id: orderSnapshot.id, ...orderSnapshot.data() }
      if (currentOrder.displayOrderNumber) {
        assignedOrder = currentOrder
        return
      }

      const number = await reserveOrderDisplayNumber(
        transaction,
        orderRef,
        year,
        highestByYear.get(year) || 0,
      )
      transaction.update(orderRef, number)
      assignedOrder = { ...currentOrder, ...number }
    })

    if (assignedOrder) {
      assignedById.set(order.id, assignedOrder)
      highestByYear.set(year, Math.max(highestByYear.get(year) || 0, getOrderNumberSequence(assignedOrder.displayOrderNumber, year)))
    }
  }

  return orders.map((order) => assignedById.get(order.id) || order)
}
