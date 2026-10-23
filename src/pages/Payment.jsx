import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPaymentForOrder, getMerchantUpiId, initializeDemoPayment, markPaymentClaimed } from '../services/paymentService'

const statusLabel = (status) => String(status || 'pending').toUpperCase()

function Payment() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadPayment = useCallback(async () => {
    if (!currentUser?.uid || !orderId) return
    setLoading(true)
    setError('')
    try {
      await initializeDemoPayment({ orderId, buyerId: currentUser.uid })
      const result = await fetchPaymentForOrder(orderId, currentUser.uid)
      setOrder(result.order)
      setPayment(result.payment)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load payment details.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, orderId])

  useEffect(() => { loadPayment() }, [loadPayment])

  const handlePaymentClaim = async () => {
    if (!order || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await markPaymentClaimed({ orderId, buyerId: currentUser.uid })
      await loadPayment()
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to claim this payment yet.')
    } finally {
      setSubmitting(false)
    }
  }

  const upiId = order?.sellerUpiId || order?.upiNumber || getMerchantUpiId()
  const upiUrl = upiId && order
    ? `upi://pay?${new URLSearchParams({ pa: upiId, pn: order.sellerName || 'ResourceHub Seller', am: Number(order.totalAmount).toFixed(2), cu: 'INR', tn: `ResourceHub order ${order.id}` })}`
    : ''

  if (loading) return <div className="container page-section"><div className="empty-state">Loading payment...</div></div>

  return (
    <div className="container page-section">
      <section className="auth-box payment-panel">
        <p className="login-selection-kicker">ORDER PAYMENT</p>
        <h1>Pay the seller</h1>
        <p className="small-text">Transfer the amount to the seller's UPI ID. Once you send it, click “I Have Paid” so the seller can confirm.</p>
        {error && <div className="error-message" role="alert">{error}</div>}
        {order && payment && (
          <>
            <div className="info-panel payment-summary">
              <h2>{order.productName}</h2>
              <p>Seller: {order.sellerName || 'Student seller'}</p>
              <p>Order: {order.id}</p>
              <div className="summary-row"><span>Total</span><strong>₹{Number(order.totalAmount).toFixed(2)}</strong></div>
              <div className="summary-row"><span>Payment status</span><strong>{statusLabel(payment.status || order.paymentStatus)}</strong></div>
            </div>
            {['pending', 'awaiting_payment'].includes(order.orderStatus || payment.status) && (
              <>
                <div className="info-panel payment-upi-details">
                  <h2>UPI details</h2>
                  {upiId ? <p>Pay to: <strong>{upiId}</strong></p> : <p>No seller or merchant UPI ID is configured.</p>}
                  {upiUrl && <a className="secondary-btn" href={upiUrl}>Open UPI app</a>}
                </div>
                <div className="payment-demo-actions">
                  <button type="button" className="primary-btn" onClick={handlePaymentClaim} disabled={submitting}>{submitting ? 'Saving...' : 'I Have Paid'}</button>
                </div>
              </>
            )}
            {(payment?.status === 'buyer_claimed' || order?.orderStatus === 'awaiting_seller_confirmation') && (
              <div className="success-message" role="status">Payment claimed. Waiting for seller confirmation.</div>
            )}
            {order?.orderStatus === 'handover_pending' && <div className="success-message" role="status">Payment confirmed. Handover is pending.</div>}
            <div className="auth-actions payment-footer-actions">
              <Link className="primary-btn" to="/dashboard">Back to transactions</Link>
              <button className="secondary-btn" type="button" onClick={() => navigate(`/product/${order.productId}`)}>View resource</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default Payment
