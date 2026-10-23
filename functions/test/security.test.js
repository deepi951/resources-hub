import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSecret,
  hashSecret,
  isEligibleResetAccount,
  isPsgTechEmail,
  isValidNewPassword,
  maskPhone,
  normalizeEmail,
  normalizePhone,
} from '../security.js'

test('secrets are high entropy and stored as one-way digests', () => {
  const firstSecret = createSecret()
  const secondSecret = createSecret()

  assert.equal(firstSecret.length, 43)
  assert.notEqual(firstSecret, secondSecret)
  assert.equal(hashSecret(firstSecret), hashSecret(firstSecret))
  assert.notEqual(hashSecret(firstSecret), firstSecret)
})

test('phone normalization accepts the registration formats and masks the value', () => {
  assert.equal(normalizePhone('98765 43210'), '+919876543210')
  assert.equal(normalizePhone('+91 98765-43210'), '+919876543210')
  assert.equal(normalizePhone('12345'), null)
  assert.equal(maskPhone('+919876543210'), '******3210')
})

test('password and PSG email policies are enforced', () => {
  assert.equal(isValidNewPassword('CampusPass1'), true)
  assert.equal(isValidNewPassword('short1'), false)
  assert.equal(isValidNewPassword('lowercase1'), false)
  assert.equal(isPsgTechEmail('STUDENT@psgtech.ac.in'), true)
  assert.equal(isPsgTechEmail('student@example.com'), false)
  assert.equal(normalizeEmail(' Student@PSGTech.ac.in '), 'student@psgtech.ac.in')
})

test('reset eligibility requires a verified PSG student and verified active phone', () => {
  const user = { uid: 'student-1', email: 'student@psgtech.ac.in', emailVerified: true }
  const profile = {
    uid: 'student-1',
    role: 'student',
    phone: '+919876543210',
    phoneVerified: true,
    status: 'active',
  }

  assert.equal(isEligibleResetAccount(user, profile), true)
  assert.equal(isEligibleResetAccount({ ...user, emailVerified: false }, profile), false)
  assert.equal(isEligibleResetAccount(user, { ...profile, phoneVerified: false }), false)
  assert.equal(isEligibleResetAccount(user, { ...profile, phone: '' }), false)
  assert.equal(isEligibleResetAccount(user, { ...profile, status: 'blocked' }), false)
  assert.equal(isEligibleResetAccount(user, { ...profile, role: 'admin' }), false)
  assert.equal(isEligibleResetAccount(user, { ...profile, uid: 'another-user' }), false)
})