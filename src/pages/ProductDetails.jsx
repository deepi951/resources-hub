import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProductById } from '../services/productService'
import { fetchReviewsForResource } from '../services/marketplaceWorkflowService'
import { useAuth } from '../context/AuthContext'
import { getProductImageUrls } from '../utils/productImages'

function ProductDetails() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewError, setReviewError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const { currentUser } = useAuth()

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProductById(productId)
        setProduct(data)
        if (data) {
          try {
            setReviews(await fetchReviewsForResource(productId))
          } catch (reviewLoadError) {
            setReviewError(reviewLoadError.message || 'Reviews are unavailable.')
          }
        }
      } catch (error) {
        setLoadError(error?.code === 'permission-denied' ? 'You do not have permission to view this resource.' : 'Unable to load this resource. Check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      loadProduct()
    }
  }, [productId])

  if (loading) {
    return <div className="container page-section"><div className="empty-state">Loading product...</div></div>
  }

  if (!product) {
    return <div className="container page-section"><div className="empty-state">{loadError || 'Product not found.'}</div><Link className="secondary-btn" to="/products">Browse Resources</Link></div>
  }

  const availableQuantity = Number(product.availableQuantity ?? product.quantity ?? 0)
  const isOwnListing = currentUser?.uid === product.sellerId
  const productImages = getProductImageUrls(product)

  return (
    <div className="container page-section">
      <div className="product-details">
        <div className="product-gallery">
          {productImages.length ? (
            productImages.map((image, index) => (
              <img key={index} src={image} alt={`${product.title} ${index + 1}`} className="product-image-large" />
            ))
          ) : (
            <div className="product-image-placeholder">🧰</div>
          )}
        </div>

        <div className="product-detail-card">
          <p className="small-text">{product.category} • {product.condition}</p>
          <h1>{product.title}</h1>
          <div className="product-price">₹{product.price}</div>

          <div className="product-meta" style={{ marginTop: '18px' }}>
            <span>{product.location}</span>
            <span>•</span>
            <span>{product.status}</span>
          </div>

          <div className="info-panel" style={{ marginTop: '18px' }}>
            <h3>Payment Available</h3>
            <p>
              {product.paymentMethod === 'cod'
                ? 'Cash on Delivery'
                : product.paymentMethod === 'upi'
                  ? 'UPI / Google Pay'
                  : 'Cash on Delivery + UPI / Google Pay'}
            </p>
            <p>Available quantity: {Number(product.availableQuantity ?? product.quantity ?? 0)}</p>
            {Number(product.availableQuantity ?? product.quantity ?? 0) === 0 && (
              <strong style={{ color: '#c0392b' }}>SOLD OUT</strong>
            )}
          </div>

          <div className="product-actions">
            <Link
              to={`/checkout/${product.id}`}
              className={`primary-btn ${availableQuantity === 0 || isOwnListing ? 'disabled' : ''}`}
              onClick={(event) => { if (availableQuantity === 0 || isOwnListing) event.preventDefault() }}
            >
              {availableQuantity === 0 ? 'SOLD OUT' : isOwnListing ? 'Your Listing' : 'Buy Now'}
            </Link>
            <Link className="secondary-btn" to={`/report/${product.id}`}>Report</Link>
          </div>

          <div className="trust-row" aria-label="Trust indicators">
            <span className="trust-pill">Student Seller</span>
            <span className="trust-pill">Campus Marketplace</span>
            <span className="trust-pill">Secure Checkout</span>
          </div>

          <div className="info-panel" style={{ marginTop: '24px' }}>
            <h3>About this item</h3>
            <p>{product.description}</p>
            <ul>
              <li>Seller: {product.sellerName || 'PSG Tech student'}</li>
              <li>Quantity: {Number(product.quantity || 1)}</li>
              <li>Block: {product.block || 'Campus'}</li>
            </ul>
          </div>

          <div className="info-panel resource-reviews" style={{ marginTop: '18px' }}>
            <h3>Buyer Feedback</h3>
            {reviewError && <p className="small-text">{reviewError}</p>}
            {reviews.length === 0 ? <p className="small-text">No feedback for this resource yet.</p> : reviews.map((review) => (
              <article className="resource-review" key={review.id}>
                <div><strong>{'★'.repeat(Number(review.rating || 0))}{'☆'.repeat(5 - Number(review.rating || 0))}</strong><span>{review.reviewerName || 'Student'}</span></div>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetails
