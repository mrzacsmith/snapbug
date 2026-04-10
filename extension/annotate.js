/* global chrome */
import { createAnnotator } from './modules/canvas-annotator.js'
import { createToolbarState, COLORS, WIDTHS } from './modules/toolbar.js'
import { createCropState, normalizeCropRegion } from './modules/crop.js'

const baseCanvas = document.getElementById('base-canvas')
const overlayCanvas = document.getElementById('overlay-canvas')
const baseCtx = baseCanvas.getContext('2d')
const overlayCtx = overlayCanvas.getContext('2d')
const statusEl = document.getElementById('annotate-status')
const textInput = document.getElementById('text-input')
const canvasWrapper = document.getElementById('canvas-wrapper')

const annotator = createAnnotator()
const toolbar = createToolbarState()
const cropState = createCropState()

// --- State ---
let isDrawing = false
let penPoints = []
let dragStart = null

// --- Build toolbar UI ---
const toolsContainer = document.getElementById('tools')
const colorsContainer = document.getElementById('colors')
const widthsContainer = document.getElementById('widths')

// Tool buttons (already in HTML)
toolsContainer.querySelectorAll('.tool-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    toolsContainer.querySelector('.tool-btn.active')?.classList.remove('active')
    btn.classList.add('active')
    toolbar.setTool(btn.dataset.tool)
  })
})

// Color swatches
COLORS.forEach((c, i) => {
  const swatch = document.createElement('button')
  swatch.className = `color-swatch${i === 0 ? ' active' : ''}`
  swatch.style.background = c.value
  swatch.title = c.label
  swatch.dataset.color = c.value
  swatch.addEventListener('click', () => {
    colorsContainer.querySelector('.color-swatch.active')?.classList.remove('active')
    swatch.classList.add('active')
    toolbar.setColor(c.value)
  })
  colorsContainer.appendChild(swatch)
})

// Width buttons
WIDTHS.forEach((w, i) => {
  const btn = document.createElement('button')
  btn.className = `width-btn${i === 0 ? ' active' : ''}`
  btn.title = w.label
  btn.dataset.width = w.value
  // Visual indicator: a line of the given width
  const line = document.createElement('span')
  line.className = 'width-line'
  line.style.height = `${w.value}px`
  btn.appendChild(line)
  btn.addEventListener('click', () => {
    widthsContainer.querySelector('.width-btn.active')?.classList.remove('active')
    btn.classList.add('active')
    toolbar.setWidth(w.value)
  })
  widthsContainer.appendChild(btn)
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

// --- Crop helpers ---
function renderCropOverlay(region) {
  const norm = normalizeCropRegion(region)
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
  // Dim everything
  overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height)
  if (norm) {
    // Clear the selected region
    overlayCtx.clearRect(norm.x, norm.y, norm.w, norm.h)
    // Border
    overlayCtx.strokeStyle = '#4361ee'
    overlayCtx.lineWidth = 2
    overlayCtx.strokeRect(norm.x, norm.y, norm.w, norm.h)
  }
}

function applyCrop(region) {
  const norm = normalizeCropRegion(region)
  if (!norm) return

  // Extract cropped image data from base canvas
  const imageData = baseCtx.getImageData(norm.x, norm.y, norm.w, norm.h)

  // Resize canvases
  baseCanvas.width = norm.w
  baseCanvas.height = norm.h
  overlayCanvas.width = norm.w
  overlayCanvas.height = norm.h

  // Put cropped image
  baseCtx.putImageData(imageData, 0, 0)

  // Clear annotations after crop
  annotator.setActions([])
  annotator.render(overlayCtx)
  statusEl.textContent = `Cropped to ${norm.w} × ${norm.h}`
}

// --- Mouse handlers ---
overlayCanvas.addEventListener('mousedown', (e) => {
  const pos = canvasCoords(e)

  if (toolbar.getTool() === 'crop') {
    cropState.start(pos.x, pos.y)
    return
  }

  if (toolbar.getTool() === 'text') {
    showTextInput(pos)
    return
  }

  isDrawing = true
  if (toolbar.getTool() === 'pen') {
    penPoints = [pos]
  } else {
    dragStart = pos
  }
})

overlayCanvas.addEventListener('mousemove', (e) => {
  const pos = canvasCoords(e)

  if (toolbar.getTool() === 'crop' && cropState.isActive()) {
    cropState.update(pos.x, pos.y)
    renderCropOverlay(cropState.getRegion())
    return
  }

  if (!isDrawing) return

  if (toolbar.getTool() === 'pen') {
    penPoints.push(pos)
    annotator.renderPreview(overlayCtx, {
      type: 'pen',
      points: penPoints,
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  } else if (toolbar.getTool() === 'arrow') {
    annotator.renderPreview(overlayCtx, {
      type: 'arrow',
      startX: dragStart.x, startY: dragStart.y,
      endX: pos.x, endY: pos.y,
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  } else if (toolbar.getTool() === 'rect') {
    annotator.renderPreview(overlayCtx, {
      type: 'rect',
      x: dragStart.x, y: dragStart.y,
      w: pos.x - dragStart.x, h: pos.y - dragStart.y,
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  }
})

overlayCanvas.addEventListener('mouseup', (e) => {
  const pos = canvasCoords(e)

  if (toolbar.getTool() === 'crop' && cropState.isActive()) {
    cropState.update(pos.x, pos.y)
    const region = cropState.confirm()
    if (region) {
      applyCrop(region)
    } else {
      annotator.render(overlayCtx)
    }
    return
  }

  if (!isDrawing) return
  isDrawing = false

  if (toolbar.getTool() === 'pen' && penPoints.length >= 2) {
    annotator.addAction({
      type: 'pen',
      points: [...penPoints],
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  } else if (toolbar.getTool() === 'arrow' && dragStart) {
    annotator.addAction({
      type: 'arrow',
      startX: dragStart.x, startY: dragStart.y,
      endX: pos.x, endY: pos.y,
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  } else if (toolbar.getTool() === 'rect' && dragStart) {
    annotator.addAction({
      type: 'rect',
      x: dragStart.x, y: dragStart.y,
      w: pos.x - dragStart.x, h: pos.y - dragStart.y,
      color: toolbar.getColor(),
      width: toolbar.getWidth(),
    })
  }

  penPoints = []
  dragStart = null
  annotator.render(overlayCtx)
})

overlayCanvas.addEventListener('mouseleave', () => {
  if (toolbar.getTool() === 'crop' && cropState.isActive()) {
    cropState.cancel()
    annotator.render(overlayCtx)
    return
  }
  if (isDrawing) {
    isDrawing = false
    penPoints = []
    dragStart = null
    annotator.render(overlayCtx)
  }
})

// Escape cancels crop
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cropState.isActive()) {
    cropState.cancel()
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
  textInput.style.color = toolbar.getColor()
  textInput.style.fontSize = `${Math.max(14, toolbar.getWidth() * 4)}px`
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
    color: toolbar.getColor(),
    fontSize: Math.max(14, toolbar.getWidth() * 4),
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
window.snapbugToolbar = toolbar
