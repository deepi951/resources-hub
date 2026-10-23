import { Link, useLocation } from 'react-router-dom'

function LoginSelection() {
  const location = useLocation()
  const error = location.state?.error

  return (
    <div className="container page-section">
      <section className="login-selection" aria-labelledby="login-selection-title">
        <header className="login-selection-header">
          <p className="login-selection-kicker">ResourceHub</p>
          <h1 id="login-selection-title">Welcome to ResourceHub</h1>
          <p>Choose how you want to continue</p>
        </header>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="login-choice-grid">
          <Link className="login-choice-card student-choice" to="/login/student">
            <span className="login-choice-label">STUDENT</span>
            <strong>Student Login</strong>
            <span>Buy, sell and exchange resources with your campus community.</span>
            <span className="login-choice-action">Continue to student login <span aria-hidden="true">-&gt;</span></span>
          </Link>

          <Link className="login-choice-card admin-choice" to="/admin/login" state={{ fromLoginSelection: true }}>
            <span className="login-choice-label">ADMIN</span>
            <strong>Admin Login</strong>
            <span>Manage resources, users, reports and marketplace activity.</span>
            <span className="login-choice-action">Continue to admin login <span aria-hidden="true">-&gt;</span></span>
          </Link>
        </div>

        <p className="login-selection-register">New to ResourceHub? <Link to="/register">Create a student account</Link></p>
      </section>
    </div>
  )
}

export default LoginSelection
