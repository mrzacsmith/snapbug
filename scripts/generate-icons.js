#!/usr/bin/env node
/**
 * Generate SnapBug extension icons at 16x16, 48x48, 128x128.
 * Uses raw PNG encoding — no dependencies.
 * Design: Camera viewfinder/crosshair with a bug antenna accent.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function createPNG(width, height, drawFn) {
  const pixels = new Uint8Array(width * height * 4)

  // Clear to transparent
  pixels.fill(0)

  // Drawing helpers
  const ctx = {
    setPixel(x, y, r, g, b, a = 255) {
      x = Math.round(x)
      y = Math.round(y)
      if (x < 0 || x >= width || y < 0 || y >= height) return
      const i = (y * width + x) * 4
      // Alpha blend
      const srcA = a / 255
      const dstA = pixels[i + 3] / 255
      const outA = srcA + dstA * (1 - srcA)
      if (outA === 0) return
      pixels[i] = Math.round((r * srcA + pixels[i] * dstA * (1 - srcA)) / outA)
      pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA)
      pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA)
      pixels[i + 3] = Math.round(outA * 255)
    },
    fillRect(x, y, w, h, r, g, b, a = 255) {
      for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
          ctx.setPixel(x + dx, y + dy, r, g, b, a)
    },
    fillCircle(cx, cy, radius, r, g, b, a = 255) {
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
          if (dx * dx + dy * dy <= radius * radius)
            ctx.setPixel(cx + dx, cy + dy, r, g, b, a)
    },
    drawLine(x0, y0, x1, y1, r, g, b, thick = 1, a = 255) {
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
      let err = dx - dy
      const half = Math.floor(thick / 2)
      while (true) {
        for (let t = -half; t <= half; t++) {
          ctx.setPixel(x0 + t, y0, r, g, b, a)
          ctx.setPixel(x0, y0 + t, r, g, b, a)
        }
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 > -dy) { err -= dy; x0 += sx }
        if (e2 < dx) { err += dx; y0 += sy }
      }
    },
    drawRoundedRect(x, y, w, h, r, cr, cg, cb, thick = 1, a = 255) {
      // Simple rounded rect via lines + corner circles
      for (let t = 0; t < thick; t++) {
        const xx = x + t, yy = y + t, ww = w - t * 2, hh = h - t * 2
        // Top
        for (let dx = r; dx < ww - r; dx++) ctx.setPixel(xx + dx, yy, cr, cg, cb, a)
        // Bottom
        for (let dx = r; dx < ww - r; dx++) ctx.setPixel(xx + dx, yy + hh - 1, cr, cg, cb, a)
        // Left
        for (let dy = r; dy < hh - r; dy++) ctx.setPixel(xx, yy + dy, cr, cg, cb, a)
        // Right
        for (let dy = r; dy < hh - r; dy++) ctx.setPixel(xx + ww - 1, yy + dy, cr, cg, cb, a)
      }
    }
  }

  drawFn(ctx, width, height)

  // Encode PNG
  // Filter: None (0) for each row
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0 // filter byte
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4
      const dstI = y * (1 + width * 4) + 1 + x * 4
      rawData[dstI] = pixels[srcI]
      rawData[dstI + 1] = pixels[srcI + 1]
      rawData[dstI + 2] = pixels[srcI + 2]
      rawData[dstI + 3] = pixels[srcI + 3]
    }
  }

  const compressed = zlib.deflateSync(rawData)

  const chunks = []

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type)
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const combined = Buffer.concat([typeBytes, data])
    const crc = crc32(combined)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc >>> 0)
    return Buffer.concat([len, combined, crcBuf])
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  chunks.push(makeChunk('IHDR', ihdr))

  // IDAT
  chunks.push(makeChunk('IDAT', compressed))

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

// CRC32
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// --- Icon design ---
function drawIcon(ctx, w, h) {
  const s = w / 128 // scale factor

  // Background: rounded blue-purple square
  const pad = Math.round(8 * s)
  const bgR = Math.round(12 * s)
  for (let y = pad; y < h - pad; y++) {
    for (let x = pad; x < w - pad; x++) {
      // Simple rounded corner check
      const inCorner = (
        (x < pad + bgR && y < pad + bgR && (x - pad - bgR) ** 2 + (y - pad - bgR) ** 2 > bgR ** 2) ||
        (x >= w - pad - bgR && y < pad + bgR && (x - w + pad + bgR) ** 2 + (y - pad - bgR) ** 2 > bgR ** 2) ||
        (x < pad + bgR && y >= h - pad - bgR && (x - pad - bgR) ** 2 + (y - h + pad + bgR) ** 2 > bgR ** 2) ||
        (x >= w - pad - bgR && y >= h - pad - bgR && (x - w + pad + bgR) ** 2 + (y - h + pad + bgR) ** 2 > bgR ** 2)
      )
      if (!inCorner) {
        ctx.setPixel(x, y, 30, 30, 60)
      }
    }
  }

  const cx = Math.round(w / 2)
  const cy = Math.round(h / 2) + Math.round(2 * s)

  // Camera body outline
  const camW = Math.round(64 * s)
  const camH = Math.round(44 * s)
  const camX = cx - Math.round(camW / 2)
  const camY = cy - Math.round(camH / 2)
  const thick = Math.max(1, Math.round(3 * s))

  // Camera body fill (dark)
  ctx.fillRect(camX, camY, camW, camH, 40, 40, 80)

  // Camera body border (bright blue)
  for (let t = 0; t < thick; t++) {
    // Top/bottom
    for (let x = camX; x < camX + camW; x++) {
      ctx.setPixel(x, camY + t, 67, 97, 238)
      ctx.setPixel(x, camY + camH - 1 - t, 67, 97, 238)
    }
    // Left/right
    for (let y = camY; y < camY + camH; y++) {
      ctx.setPixel(camX + t, y, 67, 97, 238)
      ctx.setPixel(camX + camW - 1 - t, y, 67, 97, 238)
    }
  }

  // Camera top bump (flash/viewfinder nub)
  const bumpW = Math.round(20 * s)
  const bumpH = Math.round(8 * s)
  const bumpX = cx - Math.round(bumpW / 2)
  const bumpY = camY - bumpH
  ctx.fillRect(bumpX, bumpY, bumpW, bumpH, 40, 40, 80)
  for (let t = 0; t < thick; t++) {
    for (let x = bumpX; x < bumpX + bumpW; x++) ctx.setPixel(x, bumpY + t, 67, 97, 238)
    for (let x = bumpX; x < bumpX + bumpW; x++) ctx.setPixel(x, bumpY + bumpH - 1, 67, 97, 238)
    for (let y = bumpY; y < bumpY + bumpH; y++) ctx.setPixel(bumpX + t, y, 67, 97, 238)
    for (let y = bumpY; y < bumpY + bumpH; y++) ctx.setPixel(bumpX + bumpW - 1 - t, y, 67, 97, 238)
  }

  // Lens circle (white ring)
  const lensR = Math.round(16 * s)
  const lensThick = Math.max(1, Math.round(3 * s))
  for (let dy = -lensR - lensThick; dy <= lensR + lensThick; dy++) {
    for (let dx = -lensR - lensThick; dx <= lensR + lensThick; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= lensR - lensThick / 2 && dist <= lensR + lensThick / 2) {
        ctx.setPixel(cx + dx, cy + dy, 220, 220, 240)
      }
    }
  }

  // Lens inner highlight (subtle blue)
  const innerR = Math.round(10 * s)
  ctx.fillCircle(cx, cy, innerR, 50, 60, 120, 120)

  // Crosshair in lens
  const chLen = Math.round(6 * s)
  const chThick = Math.max(1, Math.round(1.5 * s))
  // Horizontal
  for (let dx = -chLen; dx <= chLen; dx++)
    for (let t = 0; t < chThick; t++)
      ctx.setPixel(cx + dx, cy + t - Math.floor(chThick / 2), 255, 80, 80)
  // Vertical
  for (let dy = -chLen; dy <= chLen; dy++)
    for (let t = 0; t < chThick; t++)
      ctx.setPixel(cx + t - Math.floor(chThick / 2), cy + dy, 255, 80, 80)

  // Bug antenna (top-right accent) — two small antennae
  if (w >= 32) {
    const antX = cx + Math.round(22 * s)
    const antY = camY - Math.round(6 * s)
    const antLen = Math.round(10 * s)
    const dotR = Math.max(1, Math.round(2.5 * s))
    // Left antenna
    ctx.drawLine(antX, antY, antX - Math.round(4 * s), antY - antLen, 74, 222, 128, Math.max(1, Math.round(2 * s)))
    ctx.fillCircle(antX - Math.round(4 * s), antY - antLen, dotR, 74, 222, 128)
    // Right antenna
    ctx.drawLine(antX, antY, antX + Math.round(4 * s), antY - antLen, 74, 222, 128, Math.max(1, Math.round(2 * s)))
    ctx.fillCircle(antX + Math.round(4 * s), antY - antLen, dotR, 74, 222, 128)
  }
}

// Generate all sizes
const outDir = path.join(__dirname, '..', 'extension', 'icons')
for (const size of [16, 48, 128]) {
  const png = createPNG(size, size, drawIcon)
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png)
  console.log(`Generated icon${size}.png`)
}
