import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'
import DataTable from '../components/DataTable'
import { getOrderStatusLabel } from '../../utils/orderStatus'
import { formatDate, formatDateTime } from '../utils/dateUtils'
import StatusBadge from '../components/StatusBadge'
import { ensureLegacyOrderDisplayNumbers } from '../../services/orderNumberService'

const paymentMethodLabel = (method) => ({ upi: 'UPI', cod: 'Cash on Delivery', both: 'UPI / Cash on Delivery' }[String(method || '').toLowerCase()] || 'N/A')
const paymentStatusLabel = (status) => ({ paid: 'Successful', success: 'Successful', pending: 'Pending', awaiting_payment: 'Pending', buyer_claimed: 'Claimed', failed: 'Failed', cancelled: 'Cancelled', payment_not_received: 'Not confirmed' }[String(status || '').toLowerCase()] || String(status || 'Pending'))
const displayValue = (value) => value === undefined || value === null || value === '' ? 'Not provided' : value

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [usersById, setUsersById] = useState({})
  const [paymentsByOrder, setPaymentsByOrder] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [migrationWarning, setMigrationWarning] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const loadOrders = async () => {
    if (!firebaseConfigured || !db) {
      setError('Firebase is not configured. Add your project credentials before using the admin dashboard.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [ordersSnapshot, usersSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'payments')),
      ])
      const rawOrders = ordersSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      let nextOrders = rawOrders
      setMigrationWarning('')
      try {
        nextOrders = await ensureLegacyOrderDisplayNumbers(rawOrders)
      } catch (migrationError) {
        setMigrationWarning(migrationError?.message || 'Deploy the updated Firestore rules to assign persistent display order numbers.')
      }
      const nextUsersById = Object.fromEntries(usersSnapshot.docs.map((user) => [user.id, { id: user.id, ...user.data() }]))
      const nextPaymentsByOrder = Object.fromEntries(paymentsSnapshot.docs.map((payment) => [payment.id, { id: payment.id, ...payment.data() }]))
      setOrders(nextOrders)
      setUsersById(nextUsersById)
      setPaymentsByOrder(nextPaymentsByOrder)
    } catch (loadError) {
      console.error('Admin orders load failed:', loadError)
      const isPermissionIssue = loadError?.code === 'permission-denied' ||
        (typeof loadError?.message === 'string' && loadError.message.toLowerCase().includes('permission'))

      setError(
        isPermissionIssue
          ? 'Permission denied. This admin account is not allowed to read orders.'
          : loadError?.message || 'Unable to load orders right now.'
      )
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    const safeQuery = search.trim().toLowerCase()
    if (!safeQuery) return orders

    return orders.filter((order) => {
      const terms = [order.displayOrderNumber, order.id, order.buyerName, order.buyerEmail, order.productName]
      return terms.some((term) => String(term || '').toLowerCase().includes(safeQuery))
    })
  }, [orders, search])

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null

  const handleViewOrder = async (order) => {
    setSelectedOrderId(order.id)
    setSelectedPayment(paymentsByOrder[order.id] || null)
    setSelectedReturn(null)
    setDetailsLoading(true)
    setCopyMessage('')
    try {
      const [paymentSnapshot, returnSnapshot] = await Promise.all([
        getDoc(doc(db, 'payments', order.id)),
        getDoc(doc(db, 'returns', order.id)),
      ])
      setSelectedPayment(paymentSnapshot.exists() ? { id: paymentSnapshot.id, ...paymentSnapshot.data() } : paymentsByOrder[order.id] || null)
      setSelectedReturn(returnSnapshot.exists() ? returnSnapshot.data() : null)
    } catch (detailsError) {
      setError(detailsError?.message || 'Unable to load full order details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleCopyOrderId = async () => {
    if (!selectedOrder) return
    try {
      await navigator.clipboard.writeText(selectedOrder.id)
      setCopyMessage('Internal ID copied.')
    } catch {
      setCopyMessage('Copy is unavailable in this browser.')
    }
  }

  const orderColumns = [
    { key: 'displayOrderNumber', label: 'Order', width: '12%', render: (value) => <span className="table-primary-text" title={value || ''}>{value || 'Number pending'}</span> },
    { key: 'buyerName', label: 'Buyer', width: '14%', render: (value, order) => <span className="data-table-cell-text" title={order.buyerEmail || value || ''}>{value || order.buyerEmail || 'Student'}</span> },
    { key: 'productName', label: 'Product', width: '17%', render: (value) => <span className="data-table-cell-text" title={value || ''}>{value || 'Resource'}</span> },
    { key: 'totalAmount', label: 'Amount', width: '9%', className: 'admin-table-number', render: (value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}` },
    { key: 'paymentMethod', label: 'Payment', width: '13%', render: (value, order) => <span className="table-payment-cell"><span>{paymentMethodLabel(value)}</span><StatusBadge status={paymentStatusLabel(paymentsByOrder[order.id]?.status || order.paymentStatus)} /></span> },
    { key: 'orderStatus', label: 'Status', width: '16%', render: (value) => <StatusBadge status={getOrderStatusLabel(value)} /> },
    { key: 'createdAt', label: 'Date', width: '11%', render: (value) => <span className="table-date">{formatDate(value)}</span> },
    { key: 'action', label: 'Action', width: '8%', render: (_, order) => <button className="table-action" type="button" onClick={() => handleViewOrder(order)}>View</button> },
  ]

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Commerce</p>
          <h2>Orders</h2>
        </div>
        <div className="admin-section-actions">
          <button type="button" className="secondary-btn compact-btn" onClick={loadOrders} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by order, buyer or product"
            className="admin-search-input"
            aria-label="Search by order, buyer or product"
          />
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {migrationWarning && <div className="admin-alert admin-alert-info" role="status">Orders are loaded, but some display numbers could not be persisted: {migrationWarning}</div>}

        {loading ? (
          <div className="admin-empty-state">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-empty-state">No orders found.</div>
        ) : (
          <DataTable columns={orderColumns} rows={filteredOrders} emptyMessage="No orders recorded yet." ariaLabel="Admin orders" />
        )}

        {selectedOrder && <section className="admin-record-details" aria-labelledby="order-details-title">
          <header className="admin-record-details-header">
            <div>
              <h3 id="order-details-title">{selectedOrder.displayOrderNumber || 'Display number pending'}</h3>
              <p>{selectedOrder.productName || 'Order'} · Created {formatDateTime(selectedOrder.createdAt)}</p>
            </div>
            <button className="table-action" type="button" onClick={() => setSelectedOrderId('')}>Close details</button>
          </header>
          {detailsLoading ? <div className="admin-empty-state">Loading order details...</div> : <>
            <div className="admin-record-details-grid">
              <div className="admin-record-detail"><span>Buyer</span><strong>{displayValue(selectedOrder.buyerName)}</strong></div>
              <div className="admin-record-detail"><span>Buyer email</span><strong>{displayValue(selectedOrder.buyerEmail || usersById[selectedOrder.buyerId]?.email)}</strong></div>
              <div className="admin-record-detail"><span>Product</span><strong>{displayValue(selectedOrder.productName)}</strong></div>
              <div className="admin-record-detail"><span>Amount</span><strong>₹{Number(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</strong></div>
              <div className="admin-record-detail"><span>Payment method</span><strong>{paymentMethodLabel(selectedOrder.paymentMethod)}</strong></div>
              <div className="admin-record-detail"><span>Payment status</span><StatusBadge status={paymentStatusLabel(selectedPayment?.status || selectedOrder.paymentStatus)} /></div>
              <div className="admin-record-detail"><span>Order status</span><StatusBadge status={getOrderStatusLabel(selectedOrder.orderStatus)} /></div>
              <div className="admin-record-detail"><span>Seller</span><strong>{displayValue(selectedOrder.sellerName || usersById[selectedOrder.sellerId]?.fullName || usersById[selectedOrder.sellerId]?.name)}</strong></div>
              <div className="admin-record-detail"><span>Seller email</span><strong>{displayValue(usersById[selectedOrder.sellerId]?.email)}</strong></div>
              <div className="admin-record-detail"><span>Created</span><strong>{formatDateTime(selectedOrder.createdAt)}</strong></div>
              {selectedReturn && <div className="admin-record-detail"><span>Return</span><StatusBadge status={selectedReturn.status} /></div>}
            </div>
            {selectedPayment?.demo && <p className="admin-inline-note">Demo UPI result. This is not bank verification.</p>}
            <details className="admin-technical-details">
              <summary>Technical information</summary>
              <div className="admin-technical-value"><code>{selectedOrder.id}</code><button className="table-action" type="button" onClick={handleCopyOrderId}>Copy internal ID</button>{copyMessage && <span role="status">{copyMessage}</span>}</div>
            </details>
          </>}
        </section>}
      </div>
    </div>
  )
}

export default AdminOrders
