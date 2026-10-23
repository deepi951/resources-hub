import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  beginPasswordReset,
  completePasswordReset,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
} from '../services/authService'

function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token') || ''
  const [challengeToken, setChallengeToken] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [step, setStep] = useState(token ? 'link' : 'invalid')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(60)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return undefined
    const timer = window.setTimeout(() => setResendSeconds((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds, step])

  const startReset = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await beginPasswordReset(token)
      setChallengeToken(result.challengeToken)
      setMaskedPhone(result.maskedPhone)
      setResendSeconds(60)
      setStep('otp')
      navigate(location.pathname, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'This reset link is invalid or expired. Request a new link.')
      setStep('invalid')
      navigate(location.pathname, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await verifyPasswordResetOtp(challengeToken, code)
      setStep('password')
    } catch (verifyError) {
      setError(verifyError.message || 'Unable to verify this OTP.')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      await resendPasswordResetOtp(challengeToken)
      setResendSeconds(60)
      setMessage('A new OTP was sent.')
    } catch (resendError) {
      setError(resendError.message || 'Unable to resend the OTP.')
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.')
      return
    }

    setLoading(true)
    try {
      await completePasswordReset(challengeToken, password)
      setStep('complete')
      setMessage('Your password has been updated. Redirecting to login...')
      window.setTimeout(() => navigate('/login/student', { replace: true }), 1800)
    } catch (resetError) {
      setError(resetError.message || 'Unable to update your password.')
    } finally {
      setLoading(false)
    }
  }

  const title = {
    link: 'Verify your email link',
    otp: 'Verify your mobile',
    password: 'Choose a new password',
    complete: 'Password updated',
    invalid: 'Reset link unavailable',
  }[step]

  return (
    <div className="container page-section">
      <section className="auth-box reset-flow">
        <p className="reset-flow-kicker">SECURE ACCOUNT RECOVERY</p>
        <h1>{title}</h1>
        {step === 'link' && <>
          <p className="small-text">This email link is time-limited and can only be used once. Continue to send a verification code to the mobile number on your account.</p>
          <button className="primary-btn" type="button" onClick={startReset} disabled={loading}>{loading ? 'Checking link...' : 'Verify link and send OTP'}</button>
        </>}

        {step === 'otp' && <>
          <p className="small-text">Enter the code sent to {maskedPhone}. The code expires in 10 minutes.</p>
          <form onSubmit={verifyOtp}>
            <div className="form-group">
              <label htmlFor="reset-otp">SMS verification code</label>
              <input id="reset-otp" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={10} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="auth-actions">
              <button className="primary-btn" type="submit" disabled={loading || code.length < 4}>{loading ? 'Verifying...' : 'Verify mobile'}</button>
              <button className="small-text login-reset-button" type="button" onClick={resendOtp} disabled={loading || resendSeconds > 0}>
                {resendSeconds > 0 ? `Resend available in ${resendSeconds}s` : 'Resend code'}
              </button>
            </div>
          </form>
        </>}

        {step === 'password' && <p className="small-text">Both your email link and registered mobile have been verified.</p>}
        {step === 'password' && <form onSubmit={savePassword}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="form-group full">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
          </div>
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
        </form>}

        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}
        {(step === 'invalid' || step === 'complete') && <div className="auth-actions reset-back-link">
          {step === 'invalid' ? <Link to="/forgot-password" className="primary-btn">Request a new reset link</Link> : <Link to="/login/student" className="primary-btn">Go to login</Link>}
        </div>}
      </section>
    </div>
  )
}

export default ResetPassword