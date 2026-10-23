import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerStudent, isValidPsgTechEmail, isValidIndianPhone } from '../services/authService'

const initialForm = {
  fullName: '',
  department: 'CSE',
  block: '',
  registerNumber: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!form.fullName.trim()) {
      setError('Full name is required.')
      return
    }

    if (!form.block.trim()) {
      setError('Block is required.')
      return
    }

    if (!form.registerNumber.trim()) {
      setError('Register number is required.')
      return
    }

    if (!isValidPsgTechEmail(form.email)) {
      setError('Only PSG Tech email addresses ending with @psgtech.ac.in are allowed.')
      return
    }

    if (!isValidIndianPhone(form.phone)) {
      setError('Please enter a valid Indian phone number.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await registerStudent({
        fullName: form.fullName,
        department: form.department,
        block: form.block,
        registerNumber: form.registerNumber,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })

      setMessage('Verification email sent to your PSG Tech email. Please verify before buying or selling.')
      setForm(initialForm)
      navigate('/verify-email')
    } catch (err) {
      setError(err.message || 'Unable to create account right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Create Account</h1>
        <p className="small-text">Join ResourceHub as a PSG Tech student</p>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} placeholder="Enter your name" />
            </div>

            <div className="form-group">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={form.department} onChange={handleChange}>
                <option>CSE</option>
                <option>IT</option>
                <option>ECE</option>
                <option>EEE</option>
                <option>Mechanical</option>
                <option>Civil</option>
                <option>MCA</option>
                <option>M.Sc</option>
                <option>MBA</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="block">Block</label>
              <input id="block" name="block" type="text" value={form.block} onChange={handleChange} placeholder="A Block" />
            </div>

            <div className="form-group">
              <label htmlFor="registerNumber">Register Number</label>
              <input id="registerNumber" name="registerNumber" type="text" value={form.registerNumber} onChange={handleChange} placeholder="23CSE001" />
            </div>

            <div className="form-group full">
              <label htmlFor="email">PSG Tech Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@psgtech.ac.in" />
            </div>

            <div className="form-group full">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter password" />
            </div>
          </div>

          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
            <Link to="/login" className="small-text">Already have an account?</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register
