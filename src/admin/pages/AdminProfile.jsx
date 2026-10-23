import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logoutAdmin } from '../services/adminAuthService'

function AdminProfile() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const [error, setError] = useState('')
  const adminName = userProfile?.name || userProfile?.fullName || currentUser?.displayName || 'Name not provided'
  const createdAt = userProfile?.createdAt || currentUser?.metadata?.creationTime || 'Not available'

  const handleLogout = async () => {
    setError('')
    try {
      await logoutAdmin()
      navigate('/', { replace: true })
    } catch (logoutError) {
      setError(logoutError?.message || 'Unable to log out right now.')
    }
  }

  return (
    <section className="admin-page admin-profile-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Account</p>
          <h2>Administrator Profile</h2>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}

      <div className="admin-panel admin-account-panel">
        <div className="admin-account-heading">
          <span className="admin-profile-avatar">{adminName.charAt(0).toUpperCase()}</span>
          <div>
            <h3>{adminName}</h3>
            <p>{currentUser?.email || userProfile?.email || 'Email not available'}</p>
          </div>
        </div>

        <dl className="admin-account-details">
          <div><dt>Role</dt><dd>Administrator</dd></div>
          <div><dt>Account email</dt><dd>{currentUser?.email || userProfile?.email || 'Not available'}</dd></div>
          <div><dt>Email verification</dt><dd>{currentUser?.emailVerified ? 'Verified' : 'Not verified'}</dd></div>
          <div><dt>Account created</dt><dd>{createdAt}</dd></div>
          <div><dt>Account ID</dt><dd>{currentUser?.uid || 'Not available'}</dd></div>
        </dl>

        <div className="admin-account-actions">
          <Link className="secondary-btn" to="/admin/dashboard">Back to Admin Dashboard</Link>
          <button className="primary-btn" type="button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </section>
  )
}

export default AdminProfile
