import test from 'node:test'
import assert from 'node:assert/strict'
import { formatOrderDisplayNumber, getOrderNumberSequence, getOrderYear } from './orderNumberService.js'
import { getOrderStatusLabel, getPaymentStatusLabel } from '../utils/orderStatus.js'

test('display order number is stable and scoped to its year', () => {
  const number = formatOrderDisplayNumber('2026', 42)
  assert.equal(number, 'RH-2026-42')
  assert.equal(getOrderNumberSequence(number, '2026'), 42)
  assert.equal(getOrderNumberSequence(number, '2025'), 0)
})

test('order year uses Firestore creation time without changing the timestamp', () => {
  const createdAt = new Date('2026-09-23T10:49:15.716Z')
  assert.equal(getOrderYear({ createdAt }), '2026')
  assert.equal(createdAt.toISOString(), '2026-09-23T10:49:15.716Z')
  assert.equal(getOrderYear({ createdAt: { toDate: () => createdAt } }), '2026')
})

test('order and payment states reflect the practical campus marketplace flow', () => {
  assert.equal(getOrderStatusLabel('awaiting_seller_confirmation'), 'Payment claimed')
  assert.equal(getOrderStatusLabel('handover_pending'), 'Handover pending')
  assert.equal(getPaymentStatusLabel('buyer_claimed'), 'Claimed')
  assert.equal(getPaymentStatusLabel('awaiting_seller_confirmation'), 'Claimed')
})
