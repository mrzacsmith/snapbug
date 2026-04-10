import { describe, it, expect } from 'vitest'
import { createCropState, normalizeCropRegion } from './crop.js'

describe('createCropState', () => {
  it('starts inactive', () => {
    const crop = createCropState()
    expect(crop.isActive()).toBe(false)
    expect(crop.getRegion()).toBeNull()
  })

  it('activates and tracks region', () => {
    const crop = createCropState()
    crop.start(10, 20)
    expect(crop.isActive()).toBe(true)
    crop.update(110, 120)
    const region = crop.getRegion()
    expect(region).toEqual({ x: 10, y: 20, w: 100, h: 100 })
  })

  it('cancels and resets', () => {
    const crop = createCropState()
    crop.start(10, 20)
    crop.update(110, 120)
    crop.cancel()
    expect(crop.isActive()).toBe(false)
    expect(crop.getRegion()).toBeNull()
  })

  it('confirm returns region and resets', () => {
    const crop = createCropState()
    crop.start(10, 20)
    crop.update(200, 300)
    const region = crop.confirm()
    expect(region).toEqual({ x: 10, y: 20, w: 190, h: 280 })
    expect(crop.isActive()).toBe(false)
    expect(crop.getRegion()).toBeNull()
  })

  it('confirm returns null if no region', () => {
    const crop = createCropState()
    expect(crop.confirm()).toBeNull()
  })
})

describe('normalizeCropRegion', () => {
  it('normalizes negative width/height', () => {
    const result = normalizeCropRegion({ x: 100, y: 100, w: -50, h: -30 })
    expect(result).toEqual({ x: 50, y: 70, w: 50, h: 30 })
  })

  it('passes through positive values', () => {
    const result = normalizeCropRegion({ x: 10, y: 20, w: 100, h: 50 })
    expect(result).toEqual({ x: 10, y: 20, w: 100, h: 50 })
  })

  it('returns null for regions smaller than 10x10', () => {
    expect(normalizeCropRegion({ x: 0, y: 0, w: 5, h: 5 })).toBeNull()
  })

  it('returns null for regions where only one dimension is too small', () => {
    expect(normalizeCropRegion({ x: 0, y: 0, w: 5, h: 100 })).toBeNull()
  })

  it('accepts exactly 10x10', () => {
    const result = normalizeCropRegion({ x: 0, y: 0, w: 10, h: 10 })
    expect(result).toEqual({ x: 0, y: 0, w: 10, h: 10 })
  })
})
