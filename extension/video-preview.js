import { loadPendingVideo, clearPendingVideo, buildWatchUrl } from './modules/video-preview.js'
import { uploadVideo, dataUrlToBlob } from './modules/upload.js'
import { formatVideoClipboardOutput } from './modules/output.js'

const video = document.getElementById('preview-video')
const uploadBtn = document.getElementById('upload-btn')
const discardBtn = document.getElementById('discard-btn')
const status = document.getElementById('preview-status')
const noVideo = document.getElementById('no-video')
const resultPanel = document.getElementById('preview-result')
const resultUrl = document.getElementById('result-url')
const copyUrlBtn = document.getElementById('copy-url-btn')
const copyMdBtn = document.getElementById('copy-md-btn')

let pendingDataUrl = null
let pendingPageUrl = ''
let watchUrl = null
let clipboardText = null

// Load the pending video
loadPendingVideo(chrome).then(({ dataUrl, pageUrl }) => {
  if (!dataUrl) {
    video.style.display = 'none'
    document.querySelector('.preview-toolbar').style.display = 'none'
    noVideo.style.display = 'block'
    return
  }

  pendingDataUrl = dataUrl
  pendingPageUrl = pageUrl
  video.src = dataUrl
})

uploadBtn.addEventListener('click', async () => {
  if (!pendingDataUrl) return

  uploadBtn.disabled = true
  discardBtn.disabled = true
  status.textContent = 'Uploading...'
  status.className = ''

  try {
    const blob = dataUrlToBlob(pendingDataUrl)
    const { workerUrl, apiKey } = await new Promise((resolve) => {
      chrome.storage.local.get(['workerUrl', 'apiKey'], resolve)
    })

    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
    const result = await uploadVideo(blob, { workerUrl, apiKey })
    watchUrl = buildWatchUrl(result.url)
    clipboardText = formatVideoClipboardOutput({ videoUrl: watchUrl, pageUrl: pendingPageUrl, timestamp })

    chrome.storage.local.set({
      lastVideoUrl: watchUrl,
      lastVideoClipboard: clipboardText,
    })

    await clearPendingVideo(chrome)

    await navigator.clipboard.writeText(watchUrl).catch(() => {})

    status.textContent = 'Uploaded! Link copied.'
    status.className = 'success'
    resultUrl.textContent = watchUrl
    resultPanel.style.display = 'block'
    uploadBtn.style.display = 'none'
    discardBtn.style.display = 'none'
  } catch (err) {
    status.textContent = `Error: ${err.message}`
    status.className = 'error'
    uploadBtn.disabled = false
    discardBtn.disabled = false
  }
})

discardBtn.addEventListener('click', async () => {
  await clearPendingVideo(chrome)
  window.close()
})

copyUrlBtn.addEventListener('click', () => {
  if (watchUrl) {
    navigator.clipboard.writeText(watchUrl).then(() => {
      status.textContent = 'URL copied!'
    })
  }
})

copyMdBtn.addEventListener('click', () => {
  if (clipboardText) {
    navigator.clipboard.writeText(clipboardText).then(() => {
      status.textContent = 'Markdown copied!'
    })
  }
})
