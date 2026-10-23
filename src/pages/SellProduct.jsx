import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { publishProductWithImages } from '../services/productPublishingService'
import { getMerchantUpiId } from '../services/paymentService'
import { getDefaultSubcategoryForCategory, getSubcategoriesForCategory, mainCategories } from '../data/resourcehubCatalog'

const defaultForm = {
  title: '',
  description: '',
  category: 'Books & Textbooks',
  price: '',
  condition: 'Good',
  quantity: '1',
  location: 'Campus',
  block: 'A Block',
  subcategory: 'Computer Science',
  paymentMethod: 'cod',
  upiNumber: '',
}

function SellProduct() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [form, setForm] = useState(defaultForm)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const subcategoryOptions = getSubcategoriesForCategory(form.category)

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [images])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (event) => {
    const nextCategory = event.target.value
    const nextSubcategory = getDefaultSubcategoryForCategory(nextCategory)

    setForm((prev) => ({
      ...prev,
      category: nextCategory,
      subcategory: nextSubcategory,
    }))
  }

  const handleImageChange = (event) => {
    const nextFiles = Array.from(event.target.files || [])

    if (nextFiles.length + images.length > 5) {
      setError('You can upload up to 5 images only.')
      event.target.value = ''
      return
    }

    const nextImages = nextFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setImages((prev) => [...prev, ...nextImages])
    setError('')
    event.target.value = ''
  }

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => {
      const imageToRemove = prev[indexToRemove]
      if (imageToRemove?.previewUrl) URL.revokeObjectURL(imageToRemove.previewUrl)
      return prev.filter((_, index) => index !== indexToRemove)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!currentUser) {
      setError('Please login to post a product.')
      return
    }

    if (!form.title.trim() || !form.description.trim() || !form.price) {
      setError('Please complete all required fields.')
      return
    }

    if (Number(form.price) <= 0) {
      setError('Price must be greater than zero.')
      return
    }

    const selectedPaymentMethod = String(form.paymentMethod || 'cod').toLowerCase()
    if ((selectedPaymentMethod === 'upi' || selectedPaymentMethod === 'both') && !String(form.upiNumber || '').trim() && !getMerchantUpiId()) {
      setError('Please enter the seller UPI / Google Pay mobile number for UPI-based products.')
      return
    }

    if (images.length > 5) {
      setError('You can upload a maximum of 5 images.')
      return
    }

    setLoading(true)

    try {
      const uploadedFiles = images.map((image) => image.file)
      await publishProductWithImages({
        files: uploadedFiles,
        productData: {
          sellerId: currentUser.uid,
          sellerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          subcategory: form.subcategory,
          price: Number(form.price),
          condition: form.condition,
          quantity: Number(form.quantity) || 1,
          availableQuantity: Number(form.quantity) || 1,
          paymentMethod: selectedPaymentMethod,
          upiNumber: String(form.upiNumber || '').trim() || null,
          sellerUpiId: String(form.upiNumber || '').trim() || null,
          location: form.location,
          block: form.block.trim() || 'Campus',
          status: 'active',
          views: 0,
          favoritesCount: 0,
        },
      })

      setForm(defaultForm)
      setImages([])
      navigate('/products')
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Product publish failed', { code: err?.cause?.code || err?.code || null, message: err?.message })
      }
      setError(err.message || 'Unable to publish product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-section">
      <div className="auth-box">
        <h1>Post Your Product</h1>
        <p className="small-text">List an item for the PSG Tech community.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="title">Product Name</label>
              <input id="title" name="title" type="text" value={form.title} onChange={handleChange} placeholder="Enter product name" />
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
              <select
                id="subcategory"
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
              >
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>{subcategory}</option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="description">Description</label>
              <textarea id="description" name="description" rows="4" value={form.description} onChange={handleChange} placeholder="Describe your product" />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input id="price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="450" min="1" />
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

            <div className="form-group full">
              <label>Payment Options</label>
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', marginTop: '8px' }}>
                {['cod', 'upi', 'both'].map((method) => (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={form.paymentMethod === method}
                      onChange={handleChange}
                    />
                    {method === 'cod' ? 'Cash on Delivery' : method === 'upi' ? 'UPI / Google Pay' : 'COD + UPI'}
                  </label>
                ))}
              </div>
            </div>

            {(form.paymentMethod === 'upi' || form.paymentMethod === 'both') && (
              <div className="form-group full">
                <label htmlFor="upiNumber">Seller UPI / Google Pay ID (optional)</label>
                <input
                  id="upiNumber"
                  name="upiNumber"
                  type="text"
                  value={form.upiNumber}
                  onChange={handleChange}
                  placeholder="name@upi or 9876543210"
                />
                <p className="small-text">Payment is a project demo. If left blank, the configured merchant UPI ID is used. Never provide a password or PIN.</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" type="number" value={form.quantity} onChange={handleChange} min="1" />
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

            <div className="form-group full">
              <label htmlFor="images">Upload Product Photos</label>
              <input id="images" type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageChange} />
              <p className="small-text">Seller-only upload. Up to 5 images.</p>

              {images.length > 0 && (
                <div className="image-upload-grid">
                  {images.map((image, index) => (
                    <div key={`${image.file.name}-${index}`} className="image-upload-item">
                      <img
                        src={image.previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="image-upload-thumb"
                      />
                      <button
                        type="button"
                        className="image-upload-remove-btn"
                        onClick={() => handleRemoveImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="auth-actions">
            <button className="primary-btn" type="submit" disabled={loading || images.length > 5}>
              {loading ? 'Publishing...' : 'Publish Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SellProduct
