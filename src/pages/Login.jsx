import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUserProfile, loginStudent, logoutStudent } from '../services/authService'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const user = await loginStudent(form.email, form.password)

      if (!user.emailVerified) {
        navigate('/verify-email')
        return
      }

      const profile = await getUserProfile(user.uid)
      if (profile?.role !== 'student') {
        await logoutStudent()
        setError('This account is not a student account. Choose Admin Login from the Login page.')
        return
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Welcome back</h1>
        <p className="small-text">Login with your PSG Tech account</p>
        <p className="small-text"><Link to="/login">Back to login choices</Link></p>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="email">PSG Tech Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@psgtech.ac.in" />
            </div>

            <div className="form-group full">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" />
            </div>
          </div>

          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <Link className="small-text login-reset-button" to="/forgot-password">Forgot password?</Link>
          </div>
        </form>

        <div className="auth-actions" style={{ marginTop: '18px' }}>
          <Link to="/register" className="small-text">Create account</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
