const canvas = document.getElementById('base-canvas')
const ctx = canvas.getContext('2d')
const statusEl = document.getElementById('annotate-status')

chrome.storage.local.get('pendingScreenshot', ({ pendingScreenshot }) => {
  if (!pendingScreenshot) {
    statusEl.textContent = 'No screenshot found. Capture one first.'
    return
  }

  const img = new Image()
  img.onload = () => {
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
    statusEl.textContent = `Screenshot loaded (${img.naturalWidth} × ${img.naturalHeight})`

    // Clean up storage after loading
    chrome.storage.local.remove('pendingScreenshot')
  }
  img.onerror = () => {
    statusEl.textContent = 'Failed to load screenshot.'
  }
  img.src = pendingScreenshot
})
