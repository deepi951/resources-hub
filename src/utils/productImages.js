export const getProductImageUrls = (product = {}) => {
  const candidates = [
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    product.imageUrl,
  ]

  return [...new Set(candidates.filter((url) => typeof url === 'string' && url.trim()).map((url) => url.trim()))]
}