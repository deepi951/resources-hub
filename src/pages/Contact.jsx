import { Link } from 'react-router-dom'

function Contact() {
  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Contact Us</h1>
        <p className="small-text">
          Reach out for support, product concerns, or marketplace questions related to ResourceHub.
        </p>

        <div className="info-grid" style={{ marginTop: '22px' }}>
          <div className="info-panel">
            <h3>Marketplace Support</h3>
            <p>Email: support@resourcehub.example</p>
            <p>Use this address for questions about product listings, verification, or order issues.</p>
          </div>
          <div className="info-panel">
            <h3>Safety & Reporting</h3>
            <p>Email: safety@resourcehub.example</p>
            <p>Report suspicious listings, fake sellers, or unsafe buyer/seller activity.</p>
            <Link to="/report">Submit a report</Link>
          </div>
          <div className="info-panel">
            <h3>Campus Team</h3>
            <p>Contact the ResourceHub campus admin for onboarding, account verification, and access issues.</p>
          </div>
        </div>

        <div className="auth-actions" style={{ marginTop: '20px' }}>
          <Link to="/support" className="primary-btn">Need help?</Link>
          <Link to="/products" className="secondary-btn">Browse products</Link>
        </div>
      </div>
    </div>
  )
}

export default Contact
