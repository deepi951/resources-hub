import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createIssueReport } from '../services/marketplaceWorkflowService'

const reportReasons = ['Misleading listing', 'Wrong item', 'Product issue', 'Seller issue', 'Transaction issue', 'Other']

function ReportIssue() {
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId') || null
  const { currentUser } = useAuth()
  const [reason, setReason] = useState(reportReasons[0])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!description.trim()) {
      setError('Add a short description before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await createIssueReport({
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email,
        productId: productId || null,
        orderId,
        reason,
        description,
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit the report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page-section">
      <section className="auth-box workflow-form">
        <p className="login-selection-kicker">COMMUNITY SUPPORT</p>
        <h1>Report a problem</h1>
        <p className="small-text">Reports are reviewed by the ResourceHub admin team.</p>
        {submitted && <div className="success-message" role="status">Your report was submitted to the ResourceHub admin team.</div>}
        {error && <div className="error-message" role="alert">{error}</div>}
        {!submitted && <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="report-reason">Reason</label>
            <select id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
              {reportReasons.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {productId && <p className="small-text">Resource reference: {productId}</p>}
          <div className="form-group">
            <label htmlFor="report-description">Description</label>
            <textarea id="report-description" rows="5" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} required />
          </div>
          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</button>
            <Link className="secondary-btn" to={productId ? `/product/${productId}` : '/dashboard'}>Cancel</Link>
          </div>
        </form>}
        {submitted && <div className="auth-actions"><Link className="primary-btn" to="/dashboard">View report status</Link><Link className="secondary-btn" to="/products">Browse Resources</Link></div>}
      </section>
    </div>
  )
}

export default ReportIssue
