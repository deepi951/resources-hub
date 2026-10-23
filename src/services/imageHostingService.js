const maxImages = 5
const maxImageSize = 5 * 1024 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const uploadTimeoutMs = 45000

export const validateProductImageFiles = (files = []) => {
  const selectedFiles = Array.from(files)
  if (selectedFiles.length > maxImages) {
    throw new Error(`You can upload a maximum of ${maxImages} images.`)
  }

  for (const file of selectedFiles) {
    if (!allowedImageTypes.has(String(file?.type || '').toLowerCase())) {
      throw new Error(`${file?.name || 'This file'} is not supported. Choose a JPG, PNG, or WEBP image.`)
    }
    if (file.size > maxImageSize) {
      throw new Error(`${file.name} exceeds the 5 MB image limit.`)
    }
  }

  return selectedFiles
}

export const createImageUploader = ({ cloudName, uploadPreset, fetchImpl = globalThis.fetch, timeoutMs = uploadTimeoutMs } = {}) => async (files = []) => {
  const selectedFiles = validateProductImageFiles(files)
  if (!selectedFiles.length) return []
  if (!cloudName || !uploadPreset) {
    const error = new Error('Image upload is not configured. Please contact the administrator.')
    error.code = 'image-host-not-configured'
    throw error
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Image upload is unavailable in this browser.')
  }

  const urls = []
  for (const file of selectedFiles) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    let response
    try {
      response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } catch (cause) {
      const message = cause?.name === 'AbortError'
        ? 'Image upload timed out. Check your connection and try again.'
        : 'Could not reach the image host. Check your connection and try again.'
      throw new Error(message, { cause })
    } finally {
      clearTimeout(timeoutId)
    }

    let payload = {}
    try {
      payload = await response.json()
    } catch {
      payload = {}
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `Image host rejected the upload (${response.status}).`)
      error.code = payload?.error?.code || `http-${response.status}`
      throw error
    }

    let secureUrl
    try {
      secureUrl = new URL(payload.secure_url)
    } catch {
      throw new Error('Image host did not return a valid secure image URL.')
    }
    if (secureUrl.protocol !== 'https:') {
      throw new Error('Image host did not return a secure HTTPS image URL.')
    }
    urls.push(secureUrl.href)
  }

  return urls
}

const viteEnv = import.meta.env || {}
export const uploadProductImages = createImageUploader({
  cloudName: viteEnv.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: viteEnv.VITE_CLOUDINARY_UPLOAD_PRESET,
})