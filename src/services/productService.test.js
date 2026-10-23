import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
}

const { createProduct } = await import('./productService.js')
const { createImageUploader, validateProductImageFiles } = await import('./imageHostingService.js')
const { publishProductWithImages } = await import('./productPublishingService.js')
const { getProductImageUrls } = await import('../utils/productImages.js')

test('product image validation accepts JPG, PNG, and WEBP and rejects unsupported types', () => {
  const files = ['image/jpeg', 'image/png', 'image/webp'].map((type, index) => new File(['pixels'], `sample-${index}`, { type }))
  assert.equal(validateProductImageFiles(files).length, 3)
  assert.throws(() => validateProductImageFiles([new File(['text'], 'notes.txt', { type: 'text/plain' })]), /JPG, PNG, or WEBP/)
})

test('product image validation enforces count and 5 MB size limits', () => {
  const validFile = new File(['pixels'], 'sample.png', { type: 'image/png' })
  assert.throws(() => validateProductImageFiles(Array.from({ length: 6 }, () => validFile)), /maximum of 5 images/)
  const oversized = { name: 'large.png', type: 'image/png', size: 5 * 1024 * 1024 + 1 }
  assert.throws(() => validateProductImageFiles([oversized]), /exceeds the 5 MB image limit/)
})

test('image uploader reports missing Cloudinary configuration', async () => {
  const uploadImages = createImageUploader({ cloudName: '', uploadPreset: '' })
  const file = new File(['pixels'], 'sample.png', { type: 'image/png' })
  await assert.rejects(uploadImages([file]), (error) => error.code === 'image-host-not-configured' && /contact the administrator/.test(error.message))
})

test('product creation does not run after image upload fails', async () => {
  let productWriteCalled = false
  const uploadImages = async () => { throw new Error('Cloudinary rejected this upload.') }
  const persistProduct = async () => { productWriteCalled = true }
  const file = new File(['pixels'], 'sample.png', { type: 'image/png' })

  await assert.rejects(
    publishProductWithImages({ files: [file], productData: { title: 'Test item' } }, { uploadImages, persistProduct }),
    /Cloudinary rejected this upload/,
  )
  assert.equal(productWriteCalled, false)
})

test('successful upload persists secure image URLs with compatible product fields', async () => {
  let requestUrl = ''
  const uploadImages = createImageUploader({
    cloudName: 'resourcehub-images',
    uploadPreset: 'resourcehub_unsigned',
    fetchImpl: async (url, options) => {
      requestUrl = url
      assert.equal(options.method, 'POST')
      assert.equal(options.body.get('upload_preset'), 'resourcehub_unsigned')
      return { ok: true, status: 200, json: async () => ({ secure_url: 'https://res.cloudinary.com/resourcehub-images/image/upload/sample.jpg' }) }
    },
  })
  let savedProduct = null
  const file = new File(['pixels'], 'sample.jpg', { type: 'image/jpeg' })

  await publishProductWithImages({ files: [file], productData: { title: 'Test item' } }, {
    uploadImages,
    persistProduct: async (product) => { savedProduct = product; return 'product-id' },
  })

  assert.match(requestUrl, /^https:\/\/api\.cloudinary\.com\/v1_1\/resourcehub-images\/image\/upload$/)
  assert.deepEqual(savedProduct.images, ['https://res.cloudinary.com/resourcehub-images/image/upload/sample.jpg'])
  assert.equal(savedProduct.imageUrl, 'https://res.cloudinary.com/resourcehub-images/image/upload/sample.jpg')
})

test('product image rendering supports current and legacy URL fields', () => {
  assert.deepEqual(getProductImageUrls({
    images: ['https://images.example/current.jpg'],
    imageUrls: ['https://images.example/legacy-array.webp'],
    imageUrl: 'https://images.example/legacy-single.png',
  }), [
    'https://images.example/current.jpg',
    'https://images.example/legacy-array.webp',
    'https://images.example/legacy-single.png',
  ])
})

test('createProduct refuses to report local browser storage as a persisted listing', async () => {
  await assert.rejects(createProduct({
    title: 'Physics Lab Manual',
    description: 'Used for engineering practicals.',
    category: 'Books & Textbooks',
    subcategory: 'Engineering',
    price: 250,
    condition: 'Good',
    quantity: 1,
    location: 'Campus',
    block: 'Science Block',
    sellerId: 'seller-1',
    sellerName: 'Test Seller',
    images: ['https://example.com/book.jpg'],
  }), /Firebase Firestore is required/)
})
