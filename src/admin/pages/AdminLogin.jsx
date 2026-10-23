import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/adminAuthService'

function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(location.state?.error || '')
  const [loading, setLoading] = useState(false)

  if (!location.state?.fromLoginSelection) {
    return <Navigate to="/login" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await loginAdmin(form)

      if (!result.success) {
        setError(result.message)
        setLoading(false)
        return
      }

      navigate('/admin/dashboard', { replace: true })
    } catch (error) {
      setError(error?.message || 'Unable to sign in to the admin dashboard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-auth-screen">
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <div className="admin-brand-mark auth-mark">R</div>
          <p className="admin-brand-text">ResourceHub Admin</p>
          <h1>Welcome back</h1>
          <p className="admin-subtitle">Sign in to manage the ResourceHub platform.</p>
          <p className="admin-subtitle"><Link to="/login">Back to login choices</Link></p>
        </div>

        <form className="admin-auth-form" onSubmit={handleSubmit} noValidate>
          <label className="admin-field">
            <span>Admin Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@yourdomain.com"
              required
            />
          </label>

          <label className="admin-field">
            <span>Admin Password</span>
            <div className="admin-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <div className="admin-form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="primary-btn admin-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
