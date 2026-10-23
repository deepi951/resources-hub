import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteProduct, fetchProductsBySeller } from '../services/productService'
import { updateUserProfile } from '../services/authService'
import { getOrderStatusLabel, getPaymentStatusLabel } from '../utils/orderStatus'
import {
  acceptPurchaseRequest,
  fetchOrdersByBuyer,
  fetchOrdersBySeller,
  fetchPurchaseRequestsByBuyer,
  fetchPurchaseRequestsBySeller,
  rejectPurchaseRequest,
  fetchNotificationsByUser,
  markNotificationRead,
} from '../services/orderService'
import {
  completeOrder,
  completeReturn,
  fetchReportsForUser,
  fetchReturnsForUser,
  fetchReviewsByBuyer,
  requestReturn,
  submitOrderReview,
  updateReturnRequest,
} from '../services/marketplaceWorkflowService'
import { confirmSellerPayment } from '../services/paymentService'
import { getProductImageUrls } from '../utils/productImages'
import { getReturnDaysLeft, hasActiveReturn, isReturnWindowOpen } from '../utils/returnUtils'

function Dashboard() {
  const location = useLocation()
  const { currentUser, userProfile, refreshUserProfile, loading: authLoading } = useAuth()
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [sellerRequests, setSellerRequests] = useState([])
  const [buyerRequests, setBuyerRequests] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])
  const [buyerReturns, setBuyerReturns] = useState([])
  const [sellerReturns, setSellerReturns] = useState([])
  const [myReports, setMyReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileForm, setProfileForm] = useState({ phone: '', block: '', location: 'Campus' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [error, setError] = useState('')
  const [processingRequestId, setProcessingRequestId] = useState('')
  const [processingOrderId, setProcessingOrderId] = useState('')
  const [workflowMessage, setWorkflowMessage] = useState('')
  const [returnForm, setReturnForm] = useState({ orderId: '', reason: 'Wrong item', description: '' })
  const [reviewForm, setReviewForm] = useState({ orderId: '', rating: 5, comment: '' })

  const displayName = userProfile?.fullName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student'
  const returnForOrder = (orderId) => buyerReturns.find((item) => item.orderId === orderId)
  const trackedBuyerOrders = orders.filter((order) => {
    const returnRequest = returnForOrder(order.id)
    return order.orderStatus !== 'completed'
      || hasActiveReturn(returnRequest)
      || isReturnWindowOpen(order)
  })
  const historyOrders = orders.filter((order) => {
    const returnRequest = returnForOrder(order.id)
    return order.orderStatus === 'returned'
      || (order.orderStatus === 'completed' && !hasActiveReturn(returnRequest) && !isReturnWindowOpen(order))
  })
  const returnForSale = (orderId) => sellerReturns.find((item) => item.orderId === orderId)
  const trackedSalesOrders = sellerOrders.filter((order) => {
    const returnRequest = returnForSale(order.id)
    return order.orderStatus !== 'completed'
      || hasActiveReturn(returnRequest)
      || isReturnWindowOpen(order)
  })
  const historySalesOrders = sellerOrders.filter((order) => {
    const returnRequest = returnForSale(order.id)
    return order.orderStatus === 'returned'
      || (order.orderStatus === 'completed' && !hasActiveReturn(returnRequest) && !isReturnWindowOpen(order))
  })
  const historyEntries = [
    ...historyOrders.map((order) => ({ ...order, historyKind: 'Purchase' })),
    ...historySalesOrders.map((order) => ({ ...order, historyKind: 'Sale' })),
  ]

  const stats = useMemo(() => {
    const totalViews = listings.reduce((sum, item) => sum + Number(item.views || 0), 0)
    const totalFavorites = listings.reduce((sum, item) => sum + Number(item.favoritesCount || 0), 0)
    const activeListings = listings.filter((item) => ['approved', 'active'].includes(String(item.status || 'active').trim().toLowerCase())).length

    return {
      totalListings: listings.length,
      activeListings,
      totalViews,
      totalFavorites,
    }
  }, [listings])

  const loadDashboard = async () => {
    if (!currentUser?.uid) {
      setListings([])
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const [sellerListings, buyerOrders, sellerRequestsResult, buyerRequestsResult, sellerOrdersResult, buyerReturnsResult, sellerReturnsResult, reportsResult, notificationsResult, reviewsResult] = await Promise.all([
        fetchProductsBySeller(currentUser.uid),
        fetchOrdersByBuyer(currentUser.uid).catch(() => []),
        fetchPurchaseRequestsBySeller(currentUser.uid).catch(() => []),
        fetchPurchaseRequestsByBuyer(currentUser.uid).catch(() => []),
        fetchOrdersBySeller(currentUser.uid).catch(() => []),
        fetchReturnsForUser(currentUser.uid, 'buyerId').catch(() => []),
        fetchReturnsForUser(currentUser.uid, 'sellerId').catch(() => []),
        fetchReportsForUser(currentUser.uid).catch(() => []),
        fetchNotificationsByUser(currentUser.uid).catch(() => []),
        fetchReviewsByBuyer(currentUser.uid).catch(() => []),
      ])

      setListings(sellerListings)
      setOrders(Array.isArray(buyerOrders) ? buyerOrders.filter((order) => String(order.orderStatus || '').toLowerCase() !== 'cancelled') : [])
      setSellerRequests(Array.isArray(sellerRequestsResult) ? sellerRequestsResult : [])
      setBuyerRequests(Array.isArray(buyerRequestsResult) ? buyerRequestsResult : [])
      setSellerOrders(Array.isArray(sellerOrdersResult) ? sellerOrdersResult : [])
      setBuyerReturns(Array.isArray(buyerReturnsResult) ? buyerReturnsResult : [])
      setSellerReturns(Array.isArray(sellerReturnsResult) ? sellerReturnsResult : [])
      setMyReports(Array.isArray(reportsResult) ? reportsResult : [])
      setNotifications(Array.isArray(notificationsResult) ? notificationsResult : [])
      setMyReviews(Array.isArray(reviewsResult) ? reviewsResult : [])
    } catch (dashboardError) {
      console.error('Dashboard data loading failed:', dashboardError)
      console.error('Firebase error code:', dashboardError?.code)
      console.error('Firebase error message:', dashboardError?.message)

      const isPermissionError = dashboardError?.code === 'permission-denied' ||
        (typeof dashboardError?.message === 'string' && dashboardError.message.toLowerCase().includes('permission'))

      setError(
        isPermissionError
          ? 'Firestore denied access to your listings. Deploy the Firestore rules to the Firebase project configured for this app.'
          : dashboardError?.message || 'We could not load your dashboard data right now. Please try again.'
      )

      setListings([])
      setOrders([])
      setSellerRequests([])
      setBuyerRequests([])
      setSellerOrders([])
      setBuyerReturns([])
      setSellerReturns([])
      setMyReports([])
      setNotifications([])
      setMyReviews([])
    } finally {
      setLoading(false)
    }
  }

  const handleRequestDecision = async (requestId, decision) => {
    if (!currentUser || !requestId) return

    setProcessingRequestId(requestId)
    setError('')

    try {
      if (decision === 'accept') {
        await acceptPurchaseRequest(requestId, currentUser.uid)
        setProfileMessage('Purchase request accepted and order created.')
      } else {
        await rejectPurchaseRequest(requestId, currentUser.uid)
        setProfileMessage('Purchase request rejected.')
      }

      await loadDashboard()
    } catch (requestError) {
      console.error('Unable to update purchase request', requestError)
      setError(requestError?.message || 'Unable to update this request right now.')
    } finally {
      setProcessingRequestId('')
    }
  }

  const handleCompleteOrder = async (orderId) => {
    setProcessingOrderId(orderId)
    setError('')
    try {
      await completeOrder({ orderId, sellerId: currentUser.uid })
      setWorkflowMessage('Transaction marked complete. The buyer can now leave feedback or request a return.')
      await loadDashboard()
    } catch (completeError) {
      setError(completeError.message || 'Unable to complete this transaction.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleConfirmSellerPayment = async (orderId) => {
    setProcessingOrderId(orderId)
    setError('')
    try {
      await confirmSellerPayment({ orderId, sellerId: currentUser.uid })
      setWorkflowMessage('Payment confirmed. The order is now handover pending.')
      await loadDashboard()
    } catch (confirmError) {
      setError(confirmError.message || 'Unable to confirm this payment.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleSubmitReturn = async (event) => {
    event.preventDefault()
    if (!returnForm.orderId) return
    setProcessingOrderId(returnForm.orderId)
    setError('')
    try {
      await requestReturn({
        ...returnForm,
        buyerId: currentUser.uid,
        buyerName: displayName,
        buyerPhone: userProfile?.phone || profileForm.phone,
      })
      setReturnForm({ orderId: '', reason: 'Wrong item', description: '' })
      setWorkflowMessage('Return request submitted to the seller.')
      await loadDashboard()
    } catch (returnError) {
      setError(returnError.message || 'Unable to submit the return request.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleReturnAction = async (orderId, action) => {
    setProcessingOrderId(orderId)
    setError('')
    try {
      await updateReturnRequest({
        orderId,
        sellerId: currentUser.uid,
        action,
        sellerPhone: userProfile?.phone || profileForm.phone,
        sellerName: displayName,
      })
      setWorkflowMessage(action === 'PICKUP_PENDING' ? 'Pickup details shared with the buyer.' : action === 'CONTACT_REQUESTED' ? 'Your contact details were shared with the buyer.' : 'Return request declined.')
      await loadDashboard()
    } catch (returnError) {
      setError(returnError.message || 'Unable to update the return request.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleCompleteReturn = async (orderId) => {
    setProcessingOrderId(orderId)
    setError('')
    try {
      await completeReturn({ orderId, sellerId: currentUser.uid })
      setWorkflowMessage('Return marked received and resource availability restored.')
      await loadDashboard()
    } catch (returnError) {
      setError(returnError.message || 'Unable to complete the return.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleSubmitReview = async (event) => {
    event.preventDefault()
    const { orderId, rating, comment } = reviewForm
    if (!orderId || !comment.trim()) {
      setError('Choose a rating and add a short review.')
      return
    }
    setProcessingOrderId(orderId)
    setError('')
    try {
      await submitOrderReview({ orderId, buyerId: currentUser.uid, rating, comment })
      setReviewForm({ orderId: '', rating: 5, comment: '' })
      setWorkflowMessage('Thank you for your feedback.')
      await loadDashboard()
    } catch (reviewError) {
      setError(reviewError.message || 'Unable to submit feedback.')
    } finally {
      setProcessingOrderId('')
    }
  }

  const handleNotificationRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId)
      setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, read: true } : item))
    } catch (notificationError) {
      setError(notificationError.message || 'Unable to update notification.')
    }
  }

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        phone: userProfile.phone || '',
        block: userProfile.block || '',
        location: userProfile.location || 'Campus',
      })
    }
  }, [userProfile])

  useEffect(() => {
    if (currentUser) {
      loadDashboard()
    }
  }, [currentUser])

  useEffect(() => {
    if (!loading && location.hash === '#notifications') {
      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [loading, location.hash])

  const handleProfileUpdate = async (event) => {
    event.preventDefault()
    if (!currentUser || !userProfile) return

    setSavingProfile(true)
    setProfileMessage('')
    setError('')

    try {
      await updateUserProfile(currentUser.uid, {
        phone: profileForm.phone,
        block: profileForm.block,
        location: profileForm.location,
      })
      await refreshUserProfile(currentUser.uid)
      setProfileMessage('Profile updated successfully.')
    } catch (profileError) {
      console.error('Profile update failed', profileError)
      setError('Unable to update profile right now.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteProduct = async (productId) => {
    const product = listings.find((item) => item.id === productId)

    if (!currentUser || !product || product.sellerId !== currentUser.uid) {
      setError('You can only delete your own products.')
      return
    }

    try {
      await deleteProduct(productId)
      setListings((previous) => previous.filter((item) => item.id !== productId))
      setProfileMessage('Product deleted successfully.')
    } catch (deleteError) {
      console.error('Unable to delete product', deleteError)
      setError('Unable to delete this product right now.')
    }
  }

  if (authLoading) {
    return (
      <div className="container page-section">
        <div className="empty-state">Loading your account...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="container page-section">
        <div className="empty-state">Please log in to view your dashboard.</div>
      </div>
    )
  }

  return (
    <div className="container page-section">
      <div className="auth-box dashboard-shell">
        <h1>Welcome, {displayName}</h1>
        <p className="small-text">Your personal ResourceHub dashboard.</p>

        {error && <div className="error-message">{error}</div>}
        {profileMessage && <div className="success-message">{profileMessage}</div>}
        {workflowMessage && <div className="success-message" role="status">{workflowMessage}</div>}

        <div className="info-grid" style={{ marginTop: '20px' }}>
          <div className="info-panel">
            <h3>Total Listings</h3>
            <p>{loading ? 'Loading dashboard...' : error ? 'Unavailable' : stats.totalListings}</p>
          </div>
          <div className="info-panel">
            <h3>Active Listings</h3>
            <p>{loading ? 'Loading dashboard...' : error ? 'Unavailable' : stats.activeListings}</p>
          </div>
          <div className="info-panel">
            <h3>Total Views</h3>
            <p>{loading ? 'Loading dashboard...' : error ? 'Unavailable' : stats.totalViews}</p>
          </div>
          <div className="info-panel">
            <h3>Total Favorites</h3>
            <p>{loading ? 'Loading dashboard...' : error ? 'Unavailable' : stats.totalFavorites}</p>
          </div>
        </div>

        <div className="dashboard-sections">
          <div className="info-panel">
            <h3>User Information</h3>
            <ul className="dashboard-list compact-list">
              <li><span>Name</span><strong>{userProfile?.fullName || currentUser.displayName || displayName}</strong></li>
              <li><span>Email</span><strong>{userProfile?.email || currentUser.email}</strong></li>
              <li><span>User ID</span><strong>{currentUser.uid}</strong></li>
              <li><span>Role</span><strong>{userProfile?.role || 'student'}</strong></li>
              <li><span>Phone</span><strong>{userProfile?.phone || 'Not added'}</strong></li>
              <li><span>Block</span><strong>{userProfile?.block || 'Not added'}</strong></li>
            </ul>
          </div>

          <div className="info-panel">
            <h3>Quick Actions</h3>
            <div className="auth-actions" style={{ justifyContent: 'flex-start', gap: '12px', marginTop: '16px' }}>
              <Link to="/sell" className="primary-btn">Post Product</Link>
              <Link to="/products" className="secondary-btn">View Products</Link>
              <button className="secondary-btn" type="button" onClick={() => document.getElementById('my-listings')?.scrollIntoView({ behavior: 'smooth' })}>My Listings</button>
            </div>
          </div>
        </div>

        <div className="info-panel" id="my-listings" style={{ marginTop: '20px' }}>
          <h3>My Listings</h3>

          {loading ? (
            <p className="small-text">Loading your listings...</p>
          ) : listings.length === 0 ? (
            <div className="empty-state-card">
              <h3>You haven't posted any products yet.</h3>
              <p>Post your first item to start selling on campus.</p>
              <Link to="/sell" className="primary-btn">Post Your First Product</Link>
            </div>
          ) : (
            <div className="products-grid">
              {listings.map((product) => (
                <div className="product-card" key={product.id}>
                  <div className="product-image">
                    {getProductImageUrls(product)[0] ? (
                      <img src={getProductImageUrls(product)[0]} alt={product.title} />
                    ) : (
                      '📦'
                    )}
                  </div>

                  <div className="product-body">
                    <div className="product-price-row">
                      <div className="product-price">₹{product.price}</div>
                      <span className="badge">{product.condition || 'Good'}</span>
                    </div>

                    <h3 className="product-name">{product.title}</h3>

                    <div className="product-meta">
                      <span>{product.category}</span>
                      <span>•</span>
                      <span>{product.location || 'Campus'}</span>
                    </div>

                    <div className="product-meta" style={{ marginTop: '8px' }}>
                      <span>Status: {product.status || 'Approved'}</span>
                    </div>

                    <div className="product-meta" style={{ marginTop: '8px' }}>
                      <span>Views: {product.views || 0}</span>
                      <span>•</span>
                      <span>Fav: {product.favoritesCount || 0}</span>
                    </div>

                    <div className="auth-actions" style={{ justifyContent: 'flex-start', gap: '8px', marginTop: '16px' }}>
                      <Link to={`/product/${product.id}`} className="secondary-btn small-btn">View</Link>
                      <Link to={`/product/${product.id}/edit`} className="secondary-btn small-btn">Edit</Link>
                      <button
                        type="button"
                        className="secondary-btn small-btn"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-sections" style={{ marginTop: '20px' }}>
          <div className="info-panel">
            <h3>Account Settings</h3>
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <div className="form-group">
                <label htmlFor="dashboard-phone">Phone Number</label>
                <input
                  id="dashboard-phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dashboard-block">Block / Area</label>
                <input
                  id="dashboard-block"
                  type="text"
                  value={profileForm.block}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, block: event.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dashboard-location">Location</label>
                <select
                  id="dashboard-location"
                  value={profileForm.location}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))}
                >
                  <option>Campus</option>
                  <option>Hostel</option>
                  <option>Block</option>
                </select>
              </div>

              <button type="submit" className="primary-btn compact-btn" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>

          <div className="info-panel">
            <h3>Recent Orders</h3>
            {orders.length === 0 ? (
              <p className="small-text">No active orders yet.</p>
            ) : (
              <ul className="dashboard-list">
                {orders.slice(0, 4).map((order) => (
                  <li key={order.id}>
                    <span>{order.productName}</span>
                    <span className="status-chip">{order.orderStatus}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="info-panel" style={{ marginTop: '20px' }}>
          <h3>Purchase Requests</h3>
          {buyerRequests.length === 0 && sellerRequests.length === 0 ? (
            <p className="small-text">No purchase requests yet.</p>
          ) : (
            <div className="dashboard-list-wrap" style={{ display: 'grid', gap: '16px' }}>
              {sellerRequests.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '10px' }}>Requests for your listings</h4>
                  <ul className="dashboard-list">
                    {sellerRequests.map((request) => (
                      <li key={request.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <span>
                            {request.buyerName || 'Buyer'} requested {request.productName} ({request.quantity || 1})
                          </span>
                          <span className="status-chip">{request.status}</span>
                        </div>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <small className="small-text">₹{Number(request.totalAmount || 0)} · {request.requestedPaymentMethod || 'cod'}</small>
                          {request.status === 'pending' && (
                            <div className="auth-actions" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
                              <button
                                type="button"
                                className="primary-btn compact-btn"
                                onClick={() => handleRequestDecision(request.id, 'accept')}
                                disabled={processingRequestId === request.id}
                              >
                                {processingRequestId === request.id ? 'Processing...' : 'Accept'}
                              </button>
                              <button
                                type="button"
                                className="secondary-btn compact-btn"
                                onClick={() => handleRequestDecision(request.id, 'reject')}
                                disabled={processingRequestId === request.id}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {buyerRequests.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '10px' }}>Your requests</h4>
                  <ul className="dashboard-list">
                    {buyerRequests.map((request) => (
                      <li key={request.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <span>{request.productName}</span>
                          <span className="status-chip">{request.status}</span>
                        </div>
                        <small className="small-text">₹{Number(request.totalAmount || 0)} · {request.requestedPaymentMethod || 'cod'}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {sellerReturns.length > 0 && (
          <div className="info-panel workflow-panel" style={{ marginTop: '20px' }}>
            <h3>Return requests for your sales</h3>
            <ul className="dashboard-list">
              {sellerReturns.map((returnRequest) => (
                <li className="workflow-list-item" key={returnRequest.id}>
                  <div>
                    <strong>{returnRequest.productName}</strong>
                    <small>{returnRequest.reason}: {returnRequest.description}</small>
                    <small>Buyer: {returnRequest.buyerName || 'Student'}{returnRequest.buyerPhone ? ` · ${returnRequest.buyerPhone}` : ''}</small>
                  </div>
                  <span className="status-chip">{returnRequest.status}</span>
                  {returnRequest.status === 'REQUESTED' && <div className="auth-actions">
                    <button className="primary-btn compact-btn" type="button" disabled={processingOrderId === returnRequest.orderId} onClick={() => handleReturnAction(returnRequest.orderId, 'PICKUP_PENDING')}>Arrange pickup</button>
                    <button className="secondary-btn compact-btn" type="button" disabled={processingOrderId === returnRequest.orderId} onClick={() => handleReturnAction(returnRequest.orderId, 'CONTACT_REQUESTED')}>Ask buyer to contact me</button>
                    <button className="secondary-btn compact-btn" type="button" disabled={processingOrderId === returnRequest.orderId} onClick={() => handleReturnAction(returnRequest.orderId, 'REJECTED')}>Decline</button>
                  </div>}
                  {['APPROVED', 'CONTACT_REQUESTED', 'PICKUP_PENDING'].includes(returnRequest.status) && <button className="primary-btn compact-btn" type="button" disabled={processingOrderId === returnRequest.orderId} onClick={() => handleCompleteReturn(returnRequest.orderId)}>Confirm item received</button>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dashboard-sections workflow-panels" style={{ marginTop: '20px' }}>
          <section className="info-panel" id="notifications">
            <h3>Notifications</h3>
            {notifications.length === 0 ? <p className="small-text">No notifications yet.</p> : <ul className="dashboard-list">
              {notifications.slice(0, 8).map((notification) => <li className="workflow-list-item" key={notification.id}>
                <div><strong>{notification.title}</strong><small>{notification.message}</small></div>
                {!notification.read && <button className="secondary-btn compact-btn" type="button" onClick={() => handleNotificationRead(notification.id)}>Mark read</button>}
              </li>)}
            </ul>}
          </section>
          <section className="info-panel">
            <h3>My Reports</h3>
            <div className="auth-actions"><Link className="primary-btn compact-btn" to="/report">Report a problem</Link></div>
            {myReports.length === 0 ? <p className="small-text">No reports submitted.</p> : <ul className="dashboard-list">
              {myReports.map((report) => <li className="workflow-list-item" key={report.id}><span>{report.reason}</span><span className="status-chip">{report.status}</span></li>)}
            </ul>}
          </section>
        </div>

        <div className="info-panel" style={{ marginTop: '20px' }}>
          <h3>Order Tracking</h3>
          {trackedSalesOrders.length === 0 && trackedBuyerOrders.length === 0 ? (
            <p className="small-text">No active orders to follow up on.</p>
          ) : (
            <div className="dashboard-list-wrap" style={{ display: 'grid', gap: '16px' }}>
              {trackedSalesOrders.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '10px' }}>Sales orders</h4>
                  <ul className="dashboard-list">
                    {trackedSalesOrders.map((order) => (
                      <li key={order.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <span>{order.productName}</span>
                          <span className="status-chip">{getOrderStatusLabel(order.orderStatus)}</span>
                        </div>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <small className="small-text">Buyer: {order.buyerName || 'Student'} · ₹{Number(order.totalAmount || 0)}</small>
                          {order.orderStatus === 'awaiting_seller_confirmation' && (
                            <button type="button" className="primary-btn compact-btn" onClick={() => handleConfirmSellerPayment(order.id)} disabled={processingOrderId === order.id}>
                              {processingOrderId === order.id ? 'Saving...' : 'Confirm payment received'}
                            </button>
                          )}
                          {order.orderStatus === 'handover_pending' && (
                            <button type="button" className="primary-btn compact-btn" onClick={() => handleCompleteOrder(order.id)} disabled={processingOrderId === order.id}>
                              {processingOrderId === order.id ? 'Saving...' : 'Confirm handover complete'}
                            </button>
                          )}
                          {['confirmed_cod', 'confirmed'].includes(order.orderStatus) && (
                            <button type="button" className="primary-btn compact-btn" onClick={() => handleCompleteOrder(order.id)} disabled={processingOrderId === order.id}>
                              {processingOrderId === order.id ? 'Saving...' : 'Confirm handover complete'}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {trackedBuyerOrders.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '10px' }}>Your orders</h4>
                  <ul className="dashboard-list">
                    {trackedBuyerOrders.map((order) => (
                      <li key={order.id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <span>{order.productName}</span>
                          <span className="status-chip">{getOrderStatusLabel(order.orderStatus)}</span>
                        </div>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <small className="small-text">₹{Number(order.totalAmount || 0)} · Payment {getPaymentStatusLabel(order.paymentStatus)}</small>
                          <Link className="secondary-btn compact-btn" to={`/report/${order.productId}?orderId=${order.id}`}>Report transaction</Link>
                          {['upi', 'both'].includes(order.paymentMethod) && order.paymentStatus !== 'paid' && order.orderStatus === 'awaiting_payment' && (
                            <Link className="primary-btn compact-btn" to={`/payment/${order.id}`}>Pay now</Link>
                          )}
                          {['upi', 'both'].includes(order.paymentMethod) && order.orderStatus === 'awaiting_seller_confirmation' && (
                            <span className="status-chip">Payment claimed</span>
                          )}
                          {order.orderStatus === 'completed' && !myReviews.some((review) => review.transactionId === order.id) && (
                            <button className="secondary-btn compact-btn" type="button" onClick={() => setReviewForm({ orderId: order.id, rating: 5, comment: '' })}>Give Feedback</button>
                          )}
                          {order.orderStatus === 'completed' && !returnForOrder(order.id) && isReturnWindowOpen(order) && (
                            <button className="secondary-btn compact-btn" type="button" onClick={() => setReturnForm({ orderId: order.id, reason: 'Wrong item', description: '' })}>Request Return</button>
                          )}
                          {order.orderStatus === 'completed' && !returnForOrder(order.id) && isReturnWindowOpen(order) && (
                            <span className="return-window-note">Return available for {getReturnDaysLeft(order)} day{getReturnDaysLeft(order) === 1 ? '' : 's'}</span>
                          )}
                        </div>
                        {returnForOrder(order.id) && (
                          <div className="return-tracking-card">
                            <strong>Return request · {returnForOrder(order.id).status.replaceAll('_', ' ')}</strong>
                            <span>{returnForOrder(order.id).reason}: {returnForOrder(order.id).description}</span>
                            <span>Seller: {returnForOrder(order.id).sellerName || order.sellerName || 'Student seller'}</span>
                            {returnForOrder(order.id).sellerPhone || order.sellerPhone ? (
                              <a className="secondary-btn compact-btn" href={`tel:${returnForOrder(order.id).sellerPhone || order.sellerPhone}`}>Call seller · {returnForOrder(order.id).sellerPhone || order.sellerPhone}</a>
                            ) : <span className="small-text">Seller contact details will appear here when shared.</span>}
                            {returnForOrder(order.id).sellerMessage && <span>{returnForOrder(order.id).sellerMessage}</span>}
                          </div>
                        )}
                        {returnForm.orderId === order.id && (
                          <form className="workflow-inline-form" onSubmit={handleSubmitReturn}>
                            <label>Reason<select value={returnForm.reason} onChange={(event) => setReturnForm((value) => ({ ...value, reason: event.target.value }))}>{['Wrong item', 'Item condition issue', 'Item not as described', 'Other'].map((reason) => <option key={reason}>{reason}</option>)}</select></label>
                            <label>Description<textarea rows="3" value={returnForm.description} onChange={(event) => setReturnForm((value) => ({ ...value, description: event.target.value }))} required /></label>
                            <button className="primary-btn compact-btn" type="submit" disabled={processingOrderId === order.id}>{processingOrderId === order.id ? 'Submitting...' : 'Submit Return Request'}</button>
                          </form>
                        )}
                        {reviewForm.orderId === order.id && (
                          <form className="workflow-inline-form" onSubmit={handleSubmitReview}>
                            <label>Rating<select value={reviewForm.rating} onChange={(event) => setReviewForm((value) => ({ ...value, rating: Number(event.target.value) }))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</option>)}</select></label>
                            <label>Review<textarea rows="3" value={reviewForm.comment} onChange={(event) => setReviewForm((value) => ({ ...value, comment: event.target.value }))} required maxLength={1000} /></label>
                            <button className="primary-btn compact-btn" type="submit" disabled={processingOrderId === order.id}>{processingOrderId === order.id ? 'Submitting...' : 'Submit Feedback'}</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <section className="info-panel order-history-panel" aria-labelledby="order-history-title">
          <h3 id="order-history-title">Order History</h3>
          {historyEntries.length === 0 ? <p className="small-text">Completed orders move here after the 7-day return window.</p> : (
            <ul className="dashboard-list">
              {historyEntries.map((order) => {
                const completedDate = order.completedAt?.toDate ? order.completedAt.toDate() : new Date(order.completedAt || order.createdAt || 0)
                return (
                  <li key={order.id} className="order-history-item">
                    <div><strong>{order.historyKind}: {order.productName}</strong><small>{completedDate.toLocaleDateString()} · {getOrderStatusLabel(order.orderStatus)}</small></div>
                    <strong>₹{Number(order.totalAmount || 0).toFixed(2)}</strong>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
