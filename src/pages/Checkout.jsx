import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createPurchaseRequest } from '../services/orderService'
import { fetchProductById } from '../services/productService'
import { getMerchantUpiId } from '../services/paymentService'
import { getProductImageUrls } from '../utils/productImages'

function Checkout() {
  const { productId } = useParams()
  const { currentUser } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod')
  const [requestId, setRequestId] = useState('')

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) {
        setProduct(null)
        setLoading(false)
        setError('No product selected. Please choose a product first.')
        return
      }

      try {
        setLoading(true)
        setError('')
        const fetchedProduct = await fetchProductById(productId)

        if (!fetchedProduct) {
          setProduct(null)
          setError('Product not found.')
          return
        }

        setProduct(fetchedProduct)
        const method = fetchedProduct.paymentMethod || 'cod'
        if (method === 'both') {
          setSelectedPaymentMethod('cod')
        } else {
          setSelectedPaymentMethod(method)
        }
      } catch (loadError) {
        console.error('Unable to load selected product for checkout', loadError)
        setProduct(null)
        setError(loadError?.message || 'Unable to load this product right now.')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  const handleRequest = async () => {
    if (!currentUser) {
      setError('Please login before making a purchase request.')
      return
    }

    if (!product) {
      setError('Please select a valid product before continuing.')
      return
    }

    if (product.sellerId === currentUser.uid) {
      setError('You cannot buy your own resource.')
      return
    }

    if (Number(product.availableQuantity ?? product.quantity ?? 0) < 1 || product.status === 'sold_out') {
      setError('This resource is no longer available.')
      return
    }

    if (requesting) return

    const quantity = 1
    const totalAmount = Number(product.price) * quantity

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError('Invalid total amount.')
      return
    }

    const paymentMethod = product.paymentMethod === 'both' ? selectedPaymentMethod : (product.paymentMethod || 'cod')

    if (paymentMethod === 'upi' && !product.upiNumber && !product.sellerUpiId && !getMerchantUpiId()) {
      setError('No seller or merchant UPI ID is configured for this listing.')
      return
    }

    setRequesting(true)
    setError('')
    setSuccess('')

    try {
      const newRequestId = await createPurchaseRequest({
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
        buyerEmail: currentUser.email || '',
        sellerId: product.sellerId,
        sellerName: product.sellerName || 'Student Seller',
        productId: product.id,
        productName: product.title,
        quantity,
        unitPrice: Number(product.price),
        totalAmount,
        requestedPaymentMethod: paymentMethod,
      })

      setRequestId(newRequestId)
      setSuccess('Purchase request sent to seller.')
    } catch (requestError) {
      setError(requestError?.message || 'Unable to send purchase request. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <p className="login-selection-kicker">CHECKOUT</p>
        <h1>Order Summary</h1>
        <p className="small-text">Your request goes to the seller first. Payment is available after the seller accepts.</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {loading ? (
          <div className="empty-state">Loading product details...</div>
        ) : product ? (
          <>
            <div className="checkout-product-box" style={{ marginTop: '20px' }}>
              {getProductImageUrls(product)[0] ? (
                <img src={getProductImageUrls(product)[0]} alt={product.title} className="checkout-product-image" />
              ) : (
                <div className="checkout-product-placeholder">📦</div>
              )}

              <div className="checkout-product-copy">
                <h3>{product.title}</h3>
                <p>Seller: {product.sellerName || 'Student Seller'}</p>
                <p>Price: ₹{product.price}</p>
                <p>Condition: {product.condition || 'Not specified'}</p>
                <p>Available quantity: {product.availableQuantity ?? product.quantity ?? 0}</p>
              </div>
            </div>

            {product.paymentMethod === 'both' && (
              <div className="info-panel" style={{ marginTop: '20px' }}>
                <h3>Preferred Payment Method</h3>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedPaymentMethod === 'cod'}
                    onChange={() => setSelectedPaymentMethod('cod')}
                  />
                  {' '}Cash on Delivery
                </label>
                <label style={{ display: 'block' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedPaymentMethod === 'upi'}
                    onChange={() => setSelectedPaymentMethod('upi')}
                  />
                  {' '}UPI / Google Pay
                </label>
              </div>
            )}

            <div className="info-panel" style={{ marginTop: '20px' }}>
                <h3>Order Summary</h3>
              <div className="checkout-summary">
                <div className="summary-row">
                  <span>Product Price</span>
                  <strong>₹{product.price}</strong>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <strong>₹{product.price}</strong>
                </div>
              </div>
            </div>

            <div className="auth-actions">
              {!requestId && <button className="primary-btn" type="button" onClick={handleRequest} disabled={requesting || loading}>
                {requesting ? 'Sending request...' : 'Request to Buy'}
              </button>}
              {requestId && <Link className="primary-btn" to="/dashboard">Track request</Link>}
              <Link className="secondary-btn" to={`/product/${product.id}`}>Back to resource</Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default Checkout
