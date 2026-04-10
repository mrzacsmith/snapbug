const MIN_ARROW_LENGTH = 5
const MIN_RECT_SIZE = 3

export function createAnnotator() {
  const actions = []

  function addAction(action) {
    if (action.type === 'arrow') {
      const dx = action.endX - action.startX
      const dy = action.endY - action.startY
      if (Math.sqrt(dx * dx + dy * dy) < MIN_ARROW_LENGTH) return
    }
    if (action.type === 'rect') {
      if (Math.abs(action.w) < MIN_RECT_SIZE && Math.abs(action.h) < MIN_RECT_SIZE) return
    }
    actions.push(action)
  }

  function getActions() {
    return [...actions]
  }

  function setActions(newActions) {
    actions.length = 0
    actions.push(...newActions)
  }

  function render(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    for (const action of actions) {
      renderAction(ctx, action)
    }
  }

  function renderPreview(ctx, action) {
    render(ctx)
    if (action) renderAction(ctx, action)
  }

  return { addAction, getActions, setActions, render, renderPreview }
}

function renderAction(ctx, action) {
  switch (action.type) {
    case 'pen':
      renderPen(ctx, action)
      break
    case 'arrow':
      renderArrow(ctx, action)
      break
    case 'rect':
      renderRect(ctx, action)
      break
    case 'text':
      renderText(ctx, action)
      break
    case 'number':
      renderNumber(ctx, action)
      break
  }
}

function renderPen(ctx, { points, color, width }) {
  if (points.length < 2) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.restore()
}

function renderArrow(ctx, { startX, startY, endX, endY, color, width }) {
  const headLen = Math.max(10, width * 3)
  const angle = Math.atan2(endY - startY, endX - startX)

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'

  // Line
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  // Arrowhead
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLen * Math.cos(angle - Math.PI / 6),
    endY - headLen * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    endX - headLen * Math.cos(angle + Math.PI / 6),
    endY - headLen * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function renderRect(ctx, { x, y, w, h, color, width }) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

function renderText(ctx, { x, y, text, color, fontSize }) {
  const padding = 4
  const font = `${fontSize}px sans-serif`

  ctx.save()
  ctx.font = font
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(x - padding, y - textHeight - padding, textWidth + padding * 2, textHeight + padding * 2)

  // Text
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

function renderNumber(ctx, { x, y, num, color, size }) {
  const radius = size / 2

  ctx.save()

  // Filled circle
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  // Number text (white, centered)
  const fontSize = Math.round(size * 0.6)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(num), x, y)

  ctx.restore()
}
