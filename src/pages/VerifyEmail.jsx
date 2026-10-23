import { useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function VerifyEmail() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleResendVerification = async () => {
    if (!currentUser) {
      setError('No authenticated user found. Please log in again.')
      return
    }

    setError('')
    setMessage('')
    setResending(true)

    try {
      await sendEmailVerification(currentUser)
      setMessage('Verification email sent again.')
    } catch (err) {
      setError(err?.message || 'Unable to resend the verification email.')
    } finally {
      setResending(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!currentUser) {
      setError('No authenticated user found. Please log in again.')
      return
    }

    setError('')
    setMessage('')
    setChecking(true)

    try {
      await currentUser.reload()

      if (currentUser.emailVerified) {
        navigate('/login', { replace: true })
        return
      }

      setError('Your email is not verified yet. Please check your inbox and try again.')
    } catch (err) {
      setError(err?.message || 'Unable to verify your email right now.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Verify your email</h1>
        <p className="small-text">
          A verification email was sent to your PSG Tech account. Please verify before buying or selling.
        </p>

        <p className="small-text">
          {currentUser?.email || 'Your email address'}
        </p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="auth-actions" style={{ marginTop: '18px', flexWrap: 'wrap' }}>
          <button type="button" className="primary-btn" onClick={handleResendVerification} disabled={resending}>
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <button type="button" className="secondary-btn" onClick={handleCheckVerification} disabled={checking}>
            {checking ? 'Checking...' : 'I\'ve Verified My Email'}
          </button>
        </div>

        <div className="auth-actions" style={{ marginTop: '18px' }}>
          <Link to="/login" className="small-text">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
