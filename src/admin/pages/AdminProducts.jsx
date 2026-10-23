import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../firebase/firebaseConfig.js'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatDateTime } from '../utils/dateUtils'
import { getProductImageUrls } from '../../utils/productImages'

const formatValue = (value) => (value === undefined || value === null || value === '' ? 'N/A' : value)

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')

  const loadProducts = async () => {
    if (!firebaseConfigured || !db) {
      setError('Firebase is not configured. Add your project credentials before using the admin dashboard.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const snapshot = await getDocs(collection(db, 'products'))
      const nextProducts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      setProducts(nextProducts)
    } catch (loadError) {
      console.error('Admin products load failed:', loadError)
      setError(loadError?.message || 'Unable to load products right now.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const safeQuery = search.trim().toLowerCase()
    if (!safeQuery) return products

    return products.filter((product) => {
      const title = String(product.title || '').toLowerCase()
      const category = String(product.category || '').toLowerCase()
      const sellerName = String(product.sellerName || '').toLowerCase()
      return title.includes(safeQuery) || category.includes(safeQuery) || sellerName.includes(safeQuery)
    })
  }, [products, search])

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null

  const productColumns = [
    { key: 'title', label: 'Product', width: '20%', render: (value) => <span className="table-primary-text" title={value || ''}>{value || 'Untitled resource'}</span> },
    { key: 'category', label: 'Category', width: '16%', render: (value) => <span className="data-table-cell-text" title={value || ''}>{value || 'N/A'}</span> },
    { key: 'sellerName', label: 'Seller', width: '17%', render: (value) => <span className="data-table-cell-text" title={value || ''}>{value || 'Student'}</span> },
    { key: 'price', label: 'Price', width: '11%', className: 'admin-table-number', render: (value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}` },
    { key: 'status', label: 'Status', width: '12%', render: (value) => <StatusBadge status={value || 'active'} /> },
    { key: 'createdAt', label: 'Created', width: '16%', render: (value) => <span className="table-date">{formatDate(value)}</span> },
    { key: 'action', label: 'Action', width: '8%', render: (_, product) => <button className="table-action" type="button" onClick={() => setSelectedProductId(product.id)}>View</button> },
  ]

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <p className="admin-page-kicker">Catalog</p>
          <h2>Products</h2>
        </div>
        <div className="admin-section-actions">
          <button type="button" className="secondary-btn compact-btn" onClick={loadProducts} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product, category or seller"
            className="admin-search-input"
            aria-label="Search by product, category or seller"
          />
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}

        {loading ? (
          <div className="admin-empty-state">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-empty-state">No products found.</div>
        ) : (
          <DataTable columns={productColumns} rows={filteredProducts} emptyMessage="No products in the catalog." ariaLabel="Admin resources" />
        )}

        {selectedProduct && <section className="admin-record-details" aria-labelledby="product-details-title">
          <header className="admin-record-details-header">
            <div><h3 id="product-details-title">{selectedProduct.title || 'Resource details'}</h3><p>{selectedProduct.category || 'Uncategorized'} · {selectedProduct.sellerName || 'Student seller'}</p></div>
            <button className="table-action" type="button" onClick={() => setSelectedProductId('')}>Close details</button>
          </header>
          {getProductImageUrls(selectedProduct)[0] && <img className="admin-resource-image" src={getProductImageUrls(selectedProduct)[0]} alt={selectedProduct.title || 'Resource'} />}
          <div className="admin-record-details-grid">
            <div className="admin-record-detail"><span>Category</span><strong>{formatValue(selectedProduct.category)}</strong></div>
            <div className="admin-record-detail"><span>Seller</span><strong>{formatValue(selectedProduct.sellerName)}</strong></div>
            <div className="admin-record-detail"><span>Price</span><strong>₹{Number(selectedProduct.price || 0).toLocaleString('en-IN')}</strong></div>
            <div className="admin-record-detail"><span>Condition</span><strong>{formatValue(selectedProduct.condition)}</strong></div>
            <div className="admin-record-detail"><span>Availability</span><strong>{Number(selectedProduct.availableQuantity ?? selectedProduct.quantity ?? 0)} available</strong></div>
            <div className="admin-record-detail"><span>Status</span><StatusBadge status={selectedProduct.status || 'active'} /></div>
            <div className="admin-record-detail"><span>Created</span><strong>{formatDateTime(selectedProduct.createdAt)}</strong></div>
          </div>
          <div className="admin-product-description"><span>Description</span><p>{selectedProduct.description || 'No description provided.'}</p></div>
          <details className="admin-technical-details">
            <summary>Technical information</summary>
            <div className="admin-technical-value"><span>Product ID</span><code>{selectedProduct.id}</code></div>
            <div className="admin-technical-value"><span>Seller ID</span><code>{selectedProduct.sellerId || 'Not available'}</code></div>
          </details>
        </section>}
      </div>
    </div>
  )
}

export default AdminProducts
