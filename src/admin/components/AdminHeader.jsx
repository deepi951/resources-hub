function AdminHeader({ title, subtitle, actions }) {
  return (
    <div className="admin-section-header">
      <div>
        <p className="admin-page-kicker">Overview</p>
        <h2>{title}</h2>
      </div>
      <div className="admin-section-actions">
        {actions}
      </div>
    </div>
  )
}

export default AdminHeader
