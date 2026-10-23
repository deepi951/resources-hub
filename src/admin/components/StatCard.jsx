function StatCard({ label, value, change, hint, tone = 'primary' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <span className={`stat-badge ${tone}`}>{change}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  )
}

export default StatCard
