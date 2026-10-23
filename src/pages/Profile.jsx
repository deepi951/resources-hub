import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { confirmProfilePhoneVerification, startProfilePhoneVerification, updateUserProfile } from '../services/authService'

function Profile() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth()
  const [form, setForm] = useState({ phone: '', block: '', location: 'Campus' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [checkingCode, setCheckingCode] = useState(false)
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneResendSeconds, setPhoneResendSeconds] = useState(0)

  useEffect(() => {
    if (userProfile) {
      setForm({
        phone: userProfile.phone || '',
        block: userProfile.block || '',
        location: userProfile.location || 'Campus',
      })
    }
  }, [userProfile])

  useEffect(() => {
    if (phoneResendSeconds <= 0) return undefined
    const timer = window.setTimeout(() => setPhoneResendSeconds((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [phoneResendSeconds])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!currentUser) return

    setSaving(true)
    setMessage('')
    setError('')

    try {
      await updateUserProfile(currentUser.uid, {
        phone: form.phone,
        block: form.block,
        location: form.location,
        ...(form.phone !== (userProfile.phone || '') ? { phoneVerified: false, phoneVerifiedAt: null } : {}),
      })
      await refreshUserProfile(currentUser.uid)
      setMessage('Profile updated successfully.')
    } catch (error) {
      console.error('Profile update failed', error)
      setError('Unable to update profile at the moment.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendPhoneCode = async () => {
    setError('')
    setMessage('')
    setSendingCode(true)
    try {
      const result = await startProfilePhoneVerification()
      setPhoneCodeSent(true)
      setPhoneResendSeconds(60)
      setMessage(result.message)
    } catch (verificationError) {
      setError(verificationError.message || 'Unable to send a verification code.')
    } finally {
      setSendingCode(false)
    }
  }

  const phoneNeedsSaving = form.phone !== (userProfile.phone || '')

  const handleVerifyPhone = async () => {
    setError('')
    setMessage('')
    setCheckingCode(true)
    try {
      await confirmProfilePhoneVerification(phoneCode)
      await refreshUserProfile(currentUser.uid)
      setPhoneCode('')
      setPhoneCodeSent(false)
      setMessage('Your mobile number is verified.')
    } catch (verificationError) {
      setError(verificationError.message || 'Unable to verify this mobile number.')
    } finally {
      setCheckingCode(false)
    }
  }

  if (!userProfile) {
    return (
      <div className="container page-section">
        <div className="empty-state">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="container page-section">
      <div className="auth-box dashboard-shell">
        <h1>{userProfile.fullName || 'Student Profile'}</h1>
        <p className="small-text">Manage your campus profile and account information.</p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="dashboard-sections">
          <div className="info-panel">
            <h3>Profile Summary</h3>
            <ul className="dashboard-list compact-list">
              <li><span>Email</span><strong>{userProfile.email}</strong></li>
              <li><span>Phone</span><strong>{userProfile.phone || 'Not added'}{userProfile.phone && <span className={userProfile.phoneVerified ? 'phone-status phone-status-verified' : 'phone-status'}>{userProfile.phoneVerified ? 'Verified' : 'Not verified'}</span>}</strong></li>
              <li><span>Department</span><strong>{userProfile.department || 'Not added'}</strong></li>
              <li><span>Register No.</span><strong>{userProfile.registerNumber || 'Not added'}</strong></li>
              <li><span>Block</span><strong>{userProfile.block || 'Not added'}</strong></li>
              <li><span>Location</span><strong>{userProfile.location || 'Campus'}</strong></li>
            </ul>
          </div>

          <div className="info-panel">
            <h3>Account Settings</h3>
            <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group">
                <label htmlFor="profile-phone">Phone Number</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>

              {!userProfile.phoneVerified && <div className="phone-verification">
                {!phoneCodeSent ? <button type="button" className="secondary-btn compact-btn" onClick={handleSendPhoneCode} disabled={sendingCode || saving || phoneNeedsSaving}>
                  {sendingCode ? 'Sending code...' : 'Verify mobile number'}
                </button> : <div className="phone-verification-form">
                  <div className="form-group">
                    <label htmlFor="profile-phone-code">SMS verification code</label>
                    <input id="profile-phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ''))} maxLength={10} required />
                  </div>
                  <button type="button" className="small-text login-reset-button" onClick={handleSendPhoneCode} disabled={sendingCode || phoneResendSeconds > 0}>
                    {sendingCode ? 'Sending...' : phoneResendSeconds > 0 ? `Resend available in ${phoneResendSeconds}s` : 'Resend code'}
                  </button>
                  <button type="button" className="secondary-btn compact-btn" onClick={handleVerifyPhone} disabled={checkingCode || phoneCode.length < 4}>
                    {checkingCode ? 'Verifying...' : 'Confirm mobile'}
                  </button>
                </div>}
                {phoneNeedsSaving && <p className="small-text">Save the updated phone number before requesting its verification code.</p>}
                <p className="small-text">A verified mobile number is required for password recovery.</p>
              </div>}

              <div className="form-group">
                <label htmlFor="profile-block">Block / Area</label>
                <input
                  id="profile-block"
                  type="text"
                  value={form.block}
                  onChange={(event) => setForm((prev) => ({ ...prev, block: event.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-location">Location</label>
                <select
                  id="profile-location"
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                >
                  <option>Campus</option>
                  <option>Hostel</option>
                  <option>Block</option>
                </select>
              </div>

              <button type="submit" className="primary-btn compact-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        <div className="auth-actions">
          <Link to="/dashboard" className="primary-btn">Go to Dashboard</Link>
          <Link to="/products" className="secondary-btn">Browse Marketplace</Link>
        </div>
      </div>
    </div>
  )
}

export default Profile
