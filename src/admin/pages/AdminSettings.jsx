function AdminSettings() {
  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Control center</p>
          <h2>Settings</h2>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-list-stack">
          <div className="admin-activity-item">
            <div>
              <strong>Marketplace status</strong>
              <small>Public listings are enabled</small>
            </div>
            <span className="admin-pill success">Open</span>
          </div>
          <div className="admin-activity-item">
            <div>
              <strong>Verification mode</strong>
              <small>Seller verification is enforced</small>
            </div>
            <span className="admin-pill success">Required</span>
          </div>
          <div className="admin-activity-item">
            <div>
              <strong>Fraud alerts</strong>
              <small>High-risk transactions are flagged</small>
            </div>
            <span className="admin-pill warning">Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
