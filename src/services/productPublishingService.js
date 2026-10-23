import { createProduct } from './productService.js'
import { uploadProductImages } from './imageHostingService.js'

export const publishProductWithImages = async ({ files, productData }, dependencies = {}) => {
  const uploadImages = dependencies.uploadImages || uploadProductImages
  const persistProduct = dependencies.persistProduct || createProduct
  const imageUrls = await uploadImages(files)

  try {
    return await persistProduct({
      ...productData,
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
    })
  } catch (cause) {
    throw new Error(`Product could not be saved: ${cause?.message || 'Firestore request failed.'}`, { cause })
  }
}