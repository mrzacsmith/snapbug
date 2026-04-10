/* global chrome */
import { createAnnotator } from './modules/canvas-annotator.js'

const baseCanvas = document.getElementById('base-canvas')
const overlayCanvas = document.getElementById('overlay-canvas')
const baseCtx = baseCanvas.getContext('2d')
const overlayCtx = overlayCanvas.getContext('2d')
const statusEl = document.getElementById('annotate-status')
const textInput = document.getElementById('text-input')
const canvasWrapper = document.getElementById('canvas-wrapper')

const annotator = createAnnotator()

// --- State ---
let currentTool = 'pen'
let currentColor = '#ff0000'
let currentWidth = 2
let isDrawing = false
let penPoints = []
let dragStart = null

// --- Tool selection ---
document.querySelectorAll('.tool-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.tool-btn.active')?.classList.remove('active')
    btn.classList.add('active')
    currentTool = btn.dataset.tool
  })
})

// --- Coordinate transform ---
function canvasCoords(e) {
  const rect = overlayCanvas.getBoundingClientRect()
  const scaleX = overlayCanvas.width / rect.width
  const scaleY = overlayCanvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

// --- Mouse handlers ---
overlayCanvas.addEventListener('mousedown', (e) => {
  const pos = canvasCoords(e)

  if (currentTool === 'text') {
    showTextInput(pos)
    return
  }

  isDrawing = true
  if (currentTool === 'pen') {
    penPoints = [pos]
  } else {
    dragStart = pos
  }
})

overlayCanvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return
  const pos = canvasCoords(e)

  if (currentTool === 'pen') {
    penPoints.push(pos)
    annotator.renderPreview(overlayCtx, {
      type: 'pen',
      points: penPoints,
      color: currentColor,
      width: currentWidth,
    })
  } else if (currentTool === 'arrow') {
    annotator.renderPreview(overlayCtx, {
      type: 'arrow',
      startX: dragStart.x, startY: dragStart.y,
      endX: pos.x, endY: pos.y,
      color: currentColor,
      width: currentWidth,
    })
  } else if (currentTool === 'rect') {
    annotator.renderPreview(overlayCtx, {
      type: 'rect',
      x: dragStart.x, y: dragStart.y,
      w: pos.x - dragStart.x, h: pos.y - dragStart.y,
      color: currentColor,
      width: currentWidth,
    })
  }
})

overlayCanvas.addEventListener('mouseup', (e) => {
  if (!isDrawing) return
  isDrawing = false
  const pos = canvasCoords(e)

  if (currentTool === 'pen' && penPoints.length >= 2) {
    annotator.addAction({
      type: 'pen',
      points: [...penPoints],
      color: currentColor,
      width: currentWidth,
    })
  } else if (currentTool === 'arrow' && dragStart) {
    annotator.addAction({
      type: 'arrow',
      startX: dragStart.x, startY: dragStart.y,
      endX: pos.x, endY: pos.y,
      color: currentColor,
      width: currentWidth,
    })
  } else if (currentTool === 'rect' && dragStart) {
    annotator.addAction({
      type: 'rect',
      x: dragStart.x, y: dragStart.y,
      w: pos.x - dragStart.x, h: pos.y - dragStart.y,
      color: currentColor,
      width: currentWidth,
    })
  }

  penPoints = []
  dragStart = null
  annotator.render(overlayCtx)
})

overlayCanvas.addEventListener('mouseleave', () => {
  if (isDrawing) {
    isDrawing = false
    penPoints = []
    dragStart = null
    annotator.render(overlayCtx)
  }
})

// --- Text tool ---
function showTextInput(pos) {
  const rect = overlayCanvas.getBoundingClientRect()
  const scaleX = rect.width / overlayCanvas.width
  const scaleY = rect.height / overlayCanvas.height

  textInput.style.display = 'block'
  textInput.style.left = `${pos.x * scaleX}px`
  textInput.style.top = `${pos.y * scaleY}px`
  textInput.style.color = currentColor
  textInput.style.fontSize = `${Math.max(14, currentWidth * 4)}px`
  textInput.value = ''
  textInput.focus()
}

function commitText() {
  const text = textInput.value.trim()
  if (!text) {
    textInput.style.display = 'none'
    return
  }

  const rect = overlayCanvas.getBoundingClientRect()
  const scaleX = overlayCanvas.width / rect.width
  const scaleY = overlayCanvas.height / rect.height
  const x = parseFloat(textInput.style.left) * scaleX
  const y = parseFloat(textInput.style.top) * scaleY

  annotator.addAction({
    type: 'text',
    x, y,
    text,
    color: currentColor,
    fontSize: Math.max(14, currentWidth * 4),
  })

  textInput.style.display = 'none'
  textInput.value = ''
  annotator.render(overlayCtx)
}

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commitText()
  }
  if (e.key === 'Escape') {
    textInput.style.display = 'none'
    textInput.value = ''
  }
})

// --- Load screenshot ---
chrome.storage.local.get('pendingScreenshot', ({ pendingScreenshot }) => {
  if (!pendingScreenshot) {
    statusEl.textContent = 'No screenshot found. Capture one first.'
    return
  }

  const img = new Image()
  img.onload = () => {
    baseCanvas.width = img.naturalWidth
    baseCanvas.height = img.naturalHeight
    overlayCanvas.width = img.naturalWidth
    overlayCanvas.height = img.naturalHeight
    baseCtx.drawImage(img, 0, 0)
    statusEl.textContent = `Screenshot loaded (${img.naturalWidth} × ${img.naturalHeight})`
    chrome.storage.local.remove('pendingScreenshot')
  }
  img.onerror = () => {
    statusEl.textContent = 'Failed to load screenshot.'
  }
  img.src = pendingScreenshot
})

// Export for use by other modules
window.snapbugAnnotator = annotator
window.snapbugState = {
  get currentColor() { return currentColor },
  set currentColor(v) { currentColor = v },
  get currentWidth() { return currentWidth },
  set currentWidth(v) { currentWidth = v },
  get currentTool() { return currentTool },
  set currentTool(v) { currentTool = v },
}
