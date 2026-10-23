import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'

function AdminSales() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSales = async () => {
      if (!firebaseConfigured || !db) {
        setError('Firebase is not configured. Add your project credentials before using the admin dashboard.')
        setLoading(false)
        return
      }

      try {
        const snapshot = await getDocs(collection(db, 'orders'))
        const nextOrders = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        setOrders(nextOrders)
      } catch (loadError) {
        console.error('Admin sales load failed:', loadError)
        setError(loadError?.message || 'Unable to load sales data right now.')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadSales()
  }, [])

  const total = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0)

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Revenue</p>
          <h2>Sales overview</h2>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <section className="admin-stat-grid single-row">
        <div className="admin-stat-card tone-primary">
          <div className="admin-stat-label">Total revenue</div>
          <div className="admin-stat-value">₹{loading ? '...' : total}</div>
        </div>
        <div className="admin-stat-card tone-info">
          <div className="admin-stat-label">Orders</div>
          <div className="admin-stat-value">{loading ? '...' : orders.length}</div>
        </div>
      </section>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>Revenue summary</h3>
        </div>
        {loading ? (
          <div className="admin-empty-state">Loading order data...</div>
        ) : orders.length === 0 ? (
          <div className="admin-empty-state">No sales data available.</div>
        ) : (
          <div className="admin-list-stack">
            {orders.map((order) => (
              <div key={order.id} className="admin-activity-item">
                <div>
                  <strong>{order.productName || order.productId || 'Order item'}</strong>
                  <small>{order.buyerName || order.buyerId || 'Buyer'}</small>
                </div>
                <span className="admin-activity-time">₹{Number(order.totalAmount || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSales
