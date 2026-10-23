import { Link } from 'react-router-dom'

function Support() {
  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Support Center</h1>
        <p className="small-text">
          We’re here to help you buy, sell, or manage your account on ResourceHub.
        </p>

        <div className="info-grid" style={{ marginTop: '22px' }}>
          <div className="info-panel">
            <h3>Account access</h3>
            <p>Need help logging in, resetting your password, or verifying your PSG Tech email?</p>
          </div>
          <div className="info-panel">
            <h3>Listings</h3>
            <p>Questions about uploading products, images, pricing, or product visibility can be addressed here.</p>
          </div>
          <div className="info-panel">
            <h3>Orders & payments</h3>
            <p>For order status questions, payment verification, or buyer-seller communication issues, contact support.</p>
          </div>
        </div>

        <div className="auth-actions" style={{ marginTop: '20px' }}>
          <Link to="/contact" className="primary-btn">Contact support</Link>
          <Link to="/safety" className="secondary-btn">Safety guidelines</Link>
        </div>
      </div>
    </div>
  )
}

export default Support
