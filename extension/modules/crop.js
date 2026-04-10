const MIN_CROP_SIZE = 10

export function createCropState() {
  let active = false
  let startX = 0
  let startY = 0
  let endX = 0
  let endY = 0

  return {
    isActive() { return active },

    start(x, y) {
      active = true
      startX = x
      startY = y
      endX = x
      endY = y
    },

    update(x, y) {
      endX = x
      endY = y
    },

    getRegion() {
      if (!active) return null
      return { x: startX, y: startY, w: endX - startX, h: endY - startY }
    },

    confirm() {
      if (!active) return null
      const region = { x: startX, y: startY, w: endX - startX, h: endY - startY }
      active = false
      startX = startY = endX = endY = 0
      return region
    },

    cancel() {
      active = false
      startX = startY = endX = endY = 0
    },
  }
}

export function normalizeCropRegion(region) {
  let { x, y, w, h } = region
  if (w < 0) { x += w; w = -w }
  if (h < 0) { y += h; h = -h }
  if (w < MIN_CROP_SIZE || h < MIN_CROP_SIZE) return null
  return { x, y, w, h }
}
