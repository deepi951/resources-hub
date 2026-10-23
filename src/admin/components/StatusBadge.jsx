function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase().replaceAll('_', ' ')
  const toneMap = {
    active: 'success',
    approved: 'success',
    verified: 'success',
    paid: 'success',
    successful: 'success',
    completed: 'success',
    returned: 'success',
    shipped: 'info',
    confirmed: 'info',
    'cod at handover': 'info',
    'handover pending': 'info',
    processing: 'warning',
    pending: 'warning',
    'payment pending': 'warning',
    'payment claimed': 'warning',
    requested: 'warning',
    'under review': 'warning',
    review: 'warning',
    draft: 'muted',
    blocked: 'danger',
    'sold out': 'danger',
    cancelled: 'danger',
    rejected: 'danger',
    failed: 'danger',
    'payment issue': 'danger',
    refunded: 'danger',
    escalated: 'danger',
    open: 'info',
    live: 'success'
  }

  const label = String(status || 'Unknown').replaceAll('_', ' ').toUpperCase()
  return <span className={`status-badge ${toneMap[normalized] || 'neutral'}`}>{label}</span>
}

export default StatusBadge
