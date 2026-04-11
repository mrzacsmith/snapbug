#!/usr/bin/env node
/**
 * Generate Chrome Web Store assets:
 * - Store icon (128x128)
 * - Small promo tile (440x280)
 * - Marquee promo tile (1400x560)
 *
 * Uses the same zero-dependency PNG generator as the extension icons.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// --- PNG encoder (same as generate-icons.js) ---
function createPNG(width, height, drawFn) {
  const pixels = new Uint8Array(width * height * 4)
  pixels.fill(0)

  const ctx = {
    setPixel(x, y, r, g, b, a = 255) {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || x >= width || y < 0 || y >= height) return
      const i = (y * width + x) * 4
      pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a
    },
    fillRect(x, y, w, h, r, g, b, a = 255) {
      for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
          ctx.setPixel(x + dx, y + dy, r, g, b, a)
    },
    fillCircle(cx, cy, radius, r, g, b, a = 255) {
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
          if (dx*dx + dy*dy <= radius*radius)
            ctx.setPixel(cx+dx, cy+dy, r, g, b, a)
    },
    drawText(x, y, text, r, g, b, charW, charH) {
      // Simple block-letter renderer for store assets
      const letters = {
        'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        'n': [[0,0,0],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
        'a': [[0,0,0],[1,1,1],[0,0,1],[1,1,1],[1,0,1]],
        'p': [[0,0,0],[1,1,1],[1,0,1],[1,1,1],[1,0,0]],
        'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
        'u': [[0,0,0],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        'g': [[0,0,0],[1,1,1],[1,0,1],[1,1,1],[0,0,1]],
      }
      let offsetX = 0
      for (const ch of text) {
        const glyph = letters[ch]
        if (glyph) {
          for (let gy = 0; gy < glyph.length; gy++)
            for (let gx = 0; gx < glyph[gy].length; gx++)
              if (glyph[gy][gx])
                ctx.fillRect(x + offsetX + gx * charW, y + gy * charH, charW, charH, r, g, b)
          offsetX += (glyph[0].length + 1) * charW
        }
      }
    }
  }

  drawFn(ctx, width, height)

  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4
      const dstI = y * (1 + width * 4) + 1 + x * 4
      rawData[dstI] = pixels[srcI]
      rawData[dstI+1] = pixels[srcI+1]
      rawData[dstI+2] = pixels[srcI+2]
      rawData[dstI+3] = pixels[srcI+3]
    }
  }

  const compressed = zlib.deflateSync(rawData)
  const chunks = []
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type)
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const combined = Buffer.concat([typeBytes, data])
    const crc = crc32(combined)
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc >>> 0)
    return Buffer.concat([len, combined, crcBuf])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  chunks.push(makeChunk('IHDR', ihdr))
  chunks.push(makeChunk('IDAT', compressed))
  chunks.push(makeChunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(chunks)
}

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

// --- Draw functions ---

function drawPromoTile(ctx, w, h) {
  // Black background
  ctx.fillRect(0, 0, w, h, 0, 0, 0)

  // Gold border accent
  ctx.fillRect(0, 0, w, 3, 192, 158, 90)
  ctx.fillRect(0, h-3, w, 3, 192, 158, 90)

  // Camera icon in center-left
  const cx = Math.round(w * 0.3)
  const cy = Math.round(h * 0.5)
  const scale = Math.min(w, h) / 280

  // Camera body
  const camW = Math.round(80 * scale)
  const camH = Math.round(55 * scale)
  ctx.fillRect(cx - camW/2, cy - camH/2, camW, camH, 26, 26, 26)
  // Camera border
  for (let t = 0; t < 3; t++) {
    for (let x = 0; x < camW; x++) {
      ctx.setPixel(cx - camW/2 + x, cy - camH/2 + t, 192, 158, 90)
      ctx.setPixel(cx - camW/2 + x, cy + camH/2 - 1 - t, 192, 158, 90)
    }
    for (let y = 0; y < camH; y++) {
      ctx.setPixel(cx - camW/2 + t, cy - camH/2 + y, 192, 158, 90)
      ctx.setPixel(cx + camW/2 - 1 - t, cy - camH/2 + y, 192, 158, 90)
    }
  }

  // Lens
  const lensR = Math.round(18 * scale)
  for (let dy = -lensR-2; dy <= lensR+2; dy++)
    for (let dx = -lensR-2; dx <= lensR+2; dx++) {
      const dist = Math.sqrt(dx*dx + dy*dy)
      if (dist >= lensR-1 && dist <= lensR+2)
        ctx.setPixel(cx+dx, cy+dy, 220, 220, 240)
    }

  // Crosshair
  const chLen = Math.round(8 * scale)
  for (let d = -chLen; d <= chLen; d++) {
    ctx.setPixel(cx+d, cy, 255, 80, 80)
    ctx.setPixel(cx+d, cy+1, 255, 80, 80)
    ctx.setPixel(cx, cy+d, 255, 80, 80)
    ctx.setPixel(cx+1, cy+d, 255, 80, 80)
  }

  // "SnapBug" text on the right
  const textX = Math.round(w * 0.5)
  const textY = Math.round(h * 0.35)
  const charW = Math.round(8 * scale)
  const charH = Math.round(8 * scale)
  ctx.drawText(textX, textY, 'SnapBug', 192, 158, 90, charW, charH)

  // Subtitle
  const subY = textY + charH * 6 + Math.round(10 * scale)
  const subCharW = Math.round(4 * scale)
  const subCharH = Math.round(4 * scale)
  // Simple line for "Screenshot Tool"
  const subW = Math.round(180 * scale)
  ctx.fillRect(textX, subY, subW, Math.round(2 * scale), 100, 100, 100)
}

// --- Generate assets ---
const outDir = path.join(__dirname, '..', 'store-assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

// Store icon is same as extension icon - just copy it
fs.copyFileSync(
  path.join(__dirname, '..', 'extension', 'icons', 'icon128.png'),
  path.join(outDir, 'store-icon-128.png')
)
console.log('Copied store-icon-128.png')

// Small promo tile 440x280
const smallPromo = createPNG(440, 280, drawPromoTile)
fs.writeFileSync(path.join(outDir, 'small-promo-440x280.png'), smallPromo)
console.log('Generated small-promo-440x280.png')

// Marquee promo tile 1400x560
const marquee = createPNG(1400, 560, drawPromoTile)
fs.writeFileSync(path.join(outDir, 'marquee-1400x560.png'), marquee)
console.log('Generated marquee-1400x560.png')

console.log(`\nAssets saved to ${outDir}/`)
console.log('\nYou still need to take a screenshot (1280x800) of the annotation editor in use.')
