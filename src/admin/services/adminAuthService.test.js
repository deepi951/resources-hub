import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdminAuthenticated, loginAdmin } from './adminAuthService.js'

test('admin login is denied when Firebase is not configured', async () => {
  const result = await loginAdmin({
    email: 'admin@resourcehub.local',
    password: 'admin123'
  })

  assert.equal(result.success, false)
  assert.match(result.message, /Firebase is not configured/)
})

test('admin authorization requires an authenticated user with an admin profile', () => {
  assert.equal(isAdminAuthenticated({ uid: 'admin-1' }, { role: 'admin' }), true)
  assert.equal(isAdminAuthenticated({ uid: 'student-1' }, { role: 'student' }), false)
  assert.equal(isAdminAuthenticated(null, { role: 'admin' }), false)
})
