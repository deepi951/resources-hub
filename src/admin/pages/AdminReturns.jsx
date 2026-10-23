import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { decideReturn, fetchAllReturns } from '../../services/marketplaceWorkflowService'

const formatReturnDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value || '')
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString()
}

function AdminReturns() {
  const { currentUser } = useAuth()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadReturns = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchAllReturns()
      setReturns(rows)
    } catch (loadError) {
      const isPermissionIssue = loadError?.code === 'permission-denied' ||
        (typeof loadError?.message === 'string' && loadError.message.toLowerCase().includes('permission'))

      setError(
        isPermissionIssue
          ? 'Permission denied. This admin account is not allowed to read return requests.'
          : loadError?.message || 'Unable to load return requests.'
      )
      setReturns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReturns() }, [])

  const handleDecision = async (request, decision) => {
    setBusyId(request.orderId)
    setError('')
    setMessage('')
    try {
      await decideReturn({ orderId: request.orderId, adminId: currentUser.uid, decision })
      setMessage(`Return ${decision.toLowerCase()}.`)
      await loadReturns()
    } catch (decisionError) {
      setError(decisionError.message || 'Unable to update the return request.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-section-header">
        <div><p className="admin-page-kicker">Orders</p><h2>Return Requests</h2></div>
        <button className="secondary-btn compact-btn" type="button" onClick={loadReturns} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
      <div className="admin-panel">
        {loading ? <div className="admin-empty-state">Loading return requests...</div> : returns.length === 0 ? <div className="admin-empty-state">No return requests submitted.</div> : (
          <div className="admin-list-stack">
            {returns.map((request) => <article className="admin-activity-item report-review-item" key={request.id}>
              <div>
                <strong>{request.productName} <span className="admin-pill warning">{request.status}</span></strong>
                <small>Buyer {request.buyerName || request.buyerId}{request.buyerPhone ? ` · ${request.buyerPhone}` : ''} · Seller {request.sellerName || request.sellerId}{request.sellerPhone ? ` · ${request.sellerPhone}` : ''}</small>
                <small>Order {request.orderId} · Requested {formatReturnDate(request.createdAt)} · Return deadline {formatReturnDate(request.returnDeadlineAt)}</small>
                <p>{request.reason}: {request.description}</p>
                {request.sellerMessage && <p>Seller update: {request.sellerMessage}</p>}
                <small>
                  {request.contactRequestedAt && `Contact shared ${formatReturnDate(request.contactRequestedAt)} · `}
                  {request.pickupRequestedAt && `Pickup arranged ${formatReturnDate(request.pickupRequestedAt)} · `}
                  {request.sellerRespondedAt && `Seller responded ${formatReturnDate(request.sellerRespondedAt)} · `}
                  {request.returnedAt && `Item received ${formatReturnDate(request.returnedAt)}`}
                </small>
              </div>
              {request.status === 'REQUESTED' && <div className="report-admin-actions">
                <button className="primary-btn compact-btn" type="button" disabled={busyId === request.orderId} onClick={() => handleDecision(request, 'APPROVED')}>Approve</button>
                <button className="secondary-btn compact-btn" type="button" disabled={busyId === request.orderId} onClick={() => handleDecision(request, 'REJECTED')}>Reject</button>
              </div>}
            </article>)}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminReturns
