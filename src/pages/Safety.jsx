import { Link } from 'react-router-dom'

function Safety() {
  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Safety Guidelines</h1>
        <p className="small-text">
          ResourceHub is built for trusted, campus-only transactions. Please follow these rules to keep the marketplace safe.
        </p>

        <div className="info-panel" style={{ marginTop: '22px' }}>
          <h3>Community safety rules</h3>
          <ul>
            <li>Only list items you genuinely own and want to sell.</li>
            <li>Use accurate product descriptions, prices, and photos.</li>
            <li>Verify buyer and seller details before meeting or exchanging goods.</li>
            <li>Never share passwords, payment credentials, or personal banking details outside the platform.</li>
            <li>Report suspicious offers, fake listings, or unsafe behavior immediately.</li>
          </ul>
        </div>

        <div className="auth-actions" style={{ marginTop: '20px' }}>
          <Link to="/report" className="primary-btn">Report an issue</Link>
          <Link to="/support" className="secondary-btn">Support center</Link>
        </div>
      </div>
    </div>
  )
}

export default Safety
