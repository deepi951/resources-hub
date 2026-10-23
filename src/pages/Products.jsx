import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchProducts } from '../services/productService'
import { getSubcategoriesForCategory, mainCategories } from '../data/resourcehubCatalog'
import { getProductImageUrls } from '../utils/productImages'

function Products() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [localSearch, setLocalSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts()
        setProducts(data)
      } catch (error) {
        setLoadError(error?.code === 'permission-denied' ? 'Marketplace access was denied. Please check your Firebase permissions.' : 'Unable to load resources. Check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  useEffect(() => {
    const nextSearch = (searchParams.get('search') || '').trim()
    const nextCategory = (searchParams.get('category') || '').trim()
    const nextSubcategory = (searchParams.get('subcategory') || '').trim()

    if (nextCategory && nextSubcategory && !getSubcategoriesForCategory(nextCategory).includes(nextSubcategory)) {
      setSelectedCategory(nextCategory)
      setSelectedSubcategory('')
      return
    }

    setLocalSearch(nextSearch)
    setSelectedCategory(nextCategory)
    setSelectedSubcategory(nextSubcategory)
  }, [searchParams])

  const categoryOptions = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory) return []
    return getSubcategoriesForCategory(selectedCategory)
  }, [selectedCategory])

  const handleSubcategoryChange = (value) => {
    const nextSubcategory = value
    setSelectedSubcategory(nextSubcategory)
    applyFilters(localSearch, selectedCategory, nextSubcategory)
  }

  const searchTerm = localSearch.trim().toLowerCase()
  const categoryTerm = selectedCategory.trim()
  const subcategoryTerm = selectedSubcategory.trim()

  const filteredProducts = products.filter((product) => {
    const searchableText = [
      product.title,
      product.description,
      product.category,
      product.subcategory,
      product.location,
      product.block,
    ]
      .join(' ')
      .toLowerCase()

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm)
    const matchesCategory = !categoryTerm || product.category === categoryTerm
    const matchesSubcategory = !subcategoryTerm || product.subcategory === subcategoryTerm

    return matchesSearch && matchesCategory && matchesSubcategory
  })

  const applyFilters = (nextSearch, nextCategory, nextSubcategory) => {
    const params = new URLSearchParams()

    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    if (nextCategory.trim()) params.set('category', nextCategory.trim())
    if (nextSubcategory.trim()) params.set('subcategory', nextSubcategory.trim())

    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    applyFilters(localSearch, selectedCategory, selectedSubcategory)
  }

  const handleCategoryChange = (value) => {
    const nextCategory = value
    const nextSubcategory = ''
    setSelectedCategory(nextCategory)
    setSelectedSubcategory(nextSubcategory)
    applyFilters(localSearch, nextCategory, nextSubcategory)
  }

  const handleClearFilters = () => {
    setLocalSearch('')
    setSelectedCategory('')
    setSelectedSubcategory('')
    navigate('/products')
  }

  if (loading) {
    return <div className="container page-section"><div className="empty-state">Loading products...</div></div>
  }

  const heading = searchTerm
    ? `Search results for “${localSearch.trim()}”`
    : categoryTerm
      ? `${categoryTerm}`
      : 'Products'

  return (
    <div className="container page-section">
      <div className="section-header section-header-stack">
        <h2>{heading}</h2>
        <span className="listing-count">{filteredProducts.length} items</span>
      </div>

      {loadError && <div className="error-message" role="alert">{loadError}</div>}

      <div className="product-toolbar">
        <form onSubmit={handleSearchSubmit} className="product-filter-bar">
          <input
            type="search"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Search by product, category, location..."
            aria-label="Search product listings"
          />

          <select
            value={selectedCategory}
            onChange={(event) => handleCategoryChange(event.target.value)}
            aria-label="Choose category"
          >
            <option value="">All categories</option>
            {mainCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={selectedSubcategory}
            onChange={(event) => handleSubcategoryChange(event.target.value)}
            disabled={!selectedCategory}
            aria-label="Choose subcategory"
          >
            <option value="">All subcategories</option>
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory} value={subcategory}>{subcategory}</option>
            ))}
          </select>

          <button type="submit" className="primary-btn compact-btn">Apply</button>
          <button type="button" className="secondary-btn compact-btn" onClick={handleClearFilters}>Clear</button>
        </form>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state empty-state-card">
          <h3>No products found</h3>
          <p>Try a different keyword, select another category, or choose a different subcategory.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <Link className="product-card" to={`/product/${product.id}`} key={product.id}>
              <div className="product-image">
                {getProductImageUrls(product)[0] ? (
                  <img src={getProductImageUrls(product)[0]} alt={product.title} />
                ) : (
                  '🧰'
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
                  <span>{product.subcategory}</span>
                  <span>•</span>
                  <span>{product.location}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Products
