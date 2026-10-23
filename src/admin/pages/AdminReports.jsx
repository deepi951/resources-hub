import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchAllReports, updateReportStatus } from '../../services/marketplaceWorkflowService'

function AdminReports() {
  const { currentUser } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      const reportRows = await fetchAllReports()
      setReports(reportRows)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReports() }, [])

  const handleStatus = async (report, status) => {
    setUpdatingId(report.id)
    setError('')
    setMessage('')
    try {
      await updateReportStatus({ reportId: report.id, status, adminId: currentUser.uid })
      setMessage('Report status updated.')
      await loadReports()
    } catch (updateError) {
      setError(updateError.message || 'Unable to update this report.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-section-header">
        <div><p className="admin-page-kicker">Safety</p><h2>Reports & Complaints</h2></div>
        <button className="secondary-btn compact-btn" type="button" onClick={loadReports} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
      <div className="admin-panel">
        {loading ? <div className="admin-empty-state">Loading reports...</div> : reports.length === 0 ? <div className="admin-empty-state">No reports submitted.</div> : (
          <div className="admin-list-stack">
            {reports.map((report) => (
              <article className="admin-activity-item report-review-item" key={report.id}>
                <div>
                  <strong>{report.reason} <span className="admin-pill warning">{report.status}</span></strong>
                  <small>From {report.reporterName || report.reporterId} · Resource {report.productId || 'not specified'} · Transaction {report.orderId || 'not specified'}</small>
                  <p>{report.description}</p>
                </div>
                {report.status !== 'RESOLVED' && report.status !== 'REJECTED' && (
                  <div className="report-admin-actions">
                    <button className="secondary-btn compact-btn" type="button" disabled={updatingId === report.id} onClick={() => handleStatus(report, 'UNDER_REVIEW')}>Review</button>
                    <button className="primary-btn compact-btn" type="button" disabled={updatingId === report.id} onClick={() => handleStatus(report, 'RESOLVED')}>Resolve</button>
                    <button className="secondary-btn compact-btn" type="button" disabled={updatingId === report.id} onClick={() => handleStatus(report, 'REJECTED')}>Reject</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminReports
