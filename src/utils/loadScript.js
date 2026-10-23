export const loadScript = (src) => {
  return new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve(true)
        return
      }

      existingScript.addEventListener('load', () => resolve(true), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve(true)
    }
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
