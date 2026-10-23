import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../services/authService'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@psgtech\.ac\.in$/i.test(normalizedEmail)) {
      setError('Enter a valid PSG Tech email address.')
      return
    }

    setLoading(true)
    try {
      const result = await resetPassword(normalizedEmail)
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Unable to request a reset link right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-section">
      <section className="auth-box reset-flow">
        <p className="reset-flow-kicker">ACCOUNT RECOVERY</p>
        <h1>Forgot password?</h1>
        <p className="small-text">Enter your PSG Tech email. To finish resetting your password, you must also verify the mobile number already verified on your account.</p>

        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="reset-email">PSG Tech Email</label>
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@psgtech.ac.in" />
            </div>
          </div>
          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <Link to="/login/student" className="small-text">Back to login</Link>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ForgotPassword