export const RETURN_WINDOW_DAYS = 7
export const ACTIVE_RETURN_STATUSES = ['REQUESTED', 'CONTACT_REQUESTED', 'PICKUP_PENDING', 'APPROVED']

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const toDate = (value) => {
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const getReturnDeadline = (order) => {
  const completedAt = toDate(order?.completedAt || order?.updatedAt || order?.createdAt)
  return completedAt ? new Date(completedAt.getTime() + RETURN_WINDOW_DAYS * DAY_IN_MILLISECONDS) : null
}

export const getReturnDaysLeft = (order, now = new Date()) => {
  const deadline = getReturnDeadline(order)
  if (!deadline) return 0
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / DAY_IN_MILLISECONDS))
}

export const isReturnWindowOpen = (order, now = new Date()) => {
  if (String(order?.orderStatus || '').toLowerCase() !== 'completed') return false
  const deadline = getReturnDeadline(order)
  return Boolean(deadline && now.getTime() <= deadline.getTime())
}

export const hasActiveReturn = (returnRequest) => ACTIVE_RETURN_STATUSES.includes(String(returnRequest?.status || '').toUpperCase())