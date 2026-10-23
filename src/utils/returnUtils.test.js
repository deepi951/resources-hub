import test from 'node:test'
import assert from 'node:assert/strict'
import { getReturnDaysLeft, getReturnDeadline, hasActiveReturn, isReturnWindowOpen } from './returnUtils.js'

test('return eligibility lasts seven days from order completion', () => {
  const completedAt = new Date('2026-09-20T12:00:00.000Z')
  const order = { orderStatus: 'completed', completedAt }
  const now = new Date('2026-09-25T12:00:00.000Z')

  assert.equal(getReturnDeadline(order).toISOString(), '2026-09-27T12:00:00.000Z')
  assert.equal(getReturnDaysLeft(order, now), 2)
  assert.equal(isReturnWindowOpen(order, now), true)
  assert.equal(isReturnWindowOpen(order, new Date('2026-09-27T12:00:00.001Z')), false)
})

test('return eligibility reads Firestore timestamp values and rejects non-completed orders', () => {
  const completedAt = new Date('2026-09-20T12:00:00.000Z')
  const order = { orderStatus: 'confirmed', completedAt: { toDate: () => completedAt } }

  assert.equal(getReturnDeadline(order).toISOString(), '2026-09-27T12:00:00.000Z')
  assert.equal(isReturnWindowOpen(order, new Date('2026-09-22T12:00:00.000Z')), false)
})

test('active return states stay tracked until the seller closes the return', () => {
  assert.equal(hasActiveReturn({ status: 'REQUESTED' }), true)
  assert.equal(hasActiveReturn({ status: 'PICKUP_PENDING' }), true)
  assert.equal(hasActiveReturn({ status: 'RETURNED' }), false)
})