const MAX_SIZE = 5 * 1024 * 1024

export async function uploadScreenshot(blob, { workerUrl, apiKey }) {
  if (blob.size > MAX_SIZE) {
    throw new Error('File exceeds 5MB size limit')
  }

  const form = new FormData()
  form.append('image', blob, 'screenshot.png')

  const response = await fetch(`${workerUrl}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Upload failed (${response.status})`)
  }

  return response.json()
}

const VIDEO_MAX_SIZE = 100 * 1024 * 1024

export async function uploadVideo(blob, { workerUrl, apiKey, onProgress }) {
  if (blob.size > VIDEO_MAX_SIZE) {
    throw new Error('File exceeds 100MB size limit')
  }

  if (onProgress) onProgress({ phase: 'uploading', loaded: 0, total: blob.size })

  const form = new FormData()
  form.append('image', blob, 'recording.webm')

  const response = await fetch(`${workerUrl}/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  })

  if (onProgress) onProgress({ phase: 'done', loaded: blob.size, total: blob.size })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Upload failed (${response.status})`)
  }

  return response.json()
}

export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

export function flattenCanvases(baseCanvas, overlayCanvas) {
  const canvas = document.createElement('canvas')
  canvas.width = baseCanvas.width
  canvas.height = baseCanvas.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(baseCanvas, 0, 0)
  ctx.drawImage(overlayCanvas, 0, 0)
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
}
