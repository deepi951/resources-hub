import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../services/productService'
import { getProductImageUrls } from '../utils/productImages'

function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts()
        setProducts(data.slice(0, 4))
      } catch (error) {
        console.error('Unable to fetch featured products', error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-inner hero-inner-clean">
          <div className="hero-copy">
            <h1>Everything Students Need. All in One Place.</h1>
            <p>Buy and sell books, calculators, laptops, lab tools and other useful resources within your campus community.</p>
            <div className="hero-actions">
              <Link to="/products" className="primary-btn">Explore Products</Link>
              <Link to="/sell" className="secondary-btn">Sell an Item</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="section-header">
            <h2>Fresh Listings</h2>
          </div>

          {loading ? (
            <div className="empty-state">Loading featured listings...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">No listings available yet.</div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <Link className="product-card" to={`/product/${product.id}`} key={product.id}>
                  <div className="product-image">
                    {getProductImageUrls(product)[0] ? (
                      <img src={getProductImageUrls(product)[0]} alt={product.title} />
                    ) : (
                      '📘'
                    )}
                  </div>
                  <div className="product-body">
                    <div className="product-price-row">
                      <div className="product-price">₹{product.price}</div>
                      <span className="badge">{product.condition}</span>
                    </div>

                    <h3 className="product-name">{product.title}</h3>

                    <div className="product-meta">
                      <span>{product.category}</span>
                      <span>•</span>
                      <span>{product.location}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="section-header">
            <h2>How ResourceHub Works</h2>
          </div>

          <div className="info-grid">
            <div className="info-panel">
              <h3>1. Create your account</h3>
              <p>Register with your PSG Tech email to verify student access.</p>
            </div>
            <div className="info-panel">
              <h3>2. Find or list a product</h3>
              <p>Browse affordable items or post your own for other students.</p>
            </div>
            <div className="info-panel">
              <h3>3. Request and arrange payment</h3>
              <p>Send the seller a purchase request, then coordinate cash on delivery or manual UPI payment.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
