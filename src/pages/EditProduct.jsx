import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProductById, updateProduct } from '../services/productService'
import { getSubcategoriesForCategory, getDefaultSubcategoryForCategory, mainCategories } from '../data/resourcehubCatalog'

const emptyForm = {
  title: '',
  description: '',
  category: 'Books & Textbooks',
  subcategory: 'Computer Science',
  price: '',
  condition: 'Good',
  quantity: '1',
  location: 'Campus',
  block: '',
}

function EditProduct() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return

      try {
        const product = await fetchProductById(productId)

        if (!product) {
          setError('Product not found.')
          return
        }

        if (currentUser && product.sellerId && product.sellerId !== currentUser.uid) {
          setError('You can only edit your own product.')
          return
        }

        setForm({
          title: product.title || '',
          description: product.description || '',
          category: product.category || 'Books & Textbooks',
          subcategory: product.subcategory || getDefaultSubcategoryForCategory(product.category || 'Books & Textbooks'),
          price: String(product.price || ''),
          condition: product.condition || 'Good',
          quantity: String(product.quantity || 1),
          location: product.location || 'Campus',
          block: product.block || '',
        })
      } catch (loadError) {
        console.error('Unable to load product for editing', loadError)
        setError('Unable to load this product for editing.')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId, currentUser])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleCategoryChange = (event) => {
    const nextCategory = event.target.value
    setForm((previous) => ({
      ...previous,
      category: nextCategory,
      subcategory: getDefaultSubcategoryForCategory(nextCategory),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!currentUser || !productId) return

    setSaving(true)
    setError('')

    try {
      await updateProduct(productId, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        subcategory: form.subcategory,
        price: Number(form.price),
        condition: form.condition,
        quantity: Number(form.quantity || 1),
        location: form.location,
        block: form.block.trim() || 'Campus',
      })

      navigate(`/product/${productId}`)
    } catch (updateError) {
      console.error('Unable to update product', updateError)
      setError('Unable to update this product right now.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container page-section"><div className="empty-state">Loading product...</div></div>
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Edit Product</h1>
        <p className="small-text">Update your listing details.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="title">Product Name</label>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange} />
            </div>

            <div className="form-group full">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" value={form.category} onChange={handleCategoryChange}>
                {mainCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="subcategory">Subcategory</label>
              <select id="subcategory" name="subcategory" value={form.subcategory} onChange={handleChange}>
                {getSubcategoriesForCategory(form.category).map((subcategory) => (
                  <option key={subcategory} value={subcategory}>{subcategory}</option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows="4" value={form.description} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input id="price" name="price" type="number" min="1" value={form.price} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select id="condition" name="condition" value={form.condition} onChange={handleChange}>
                <option>New</option>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Used</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <select id="location" name="location" value={form.location} onChange={handleChange}>
                <option>Campus</option>
                <option>Hostel</option>
                <option>Block</option>
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="block">Block / Area</label>
              <input id="block" name="block" type="text" value={form.block} onChange={handleChange} placeholder="A Block" />
            </div>
          </div>

          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            <Link to="/dashboard" className="secondary-btn">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProduct
