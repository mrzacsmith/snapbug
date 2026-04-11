import { describe, it, expect } from 'vitest'
import { compareVersions } from './version-check.js'

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.4', '1.0.4')).toBe(0)
  })

  it('returns -1 when first is older', () => {
    expect(compareVersions('1.0.4', '1.0.5')).toBe(-1)
  })

  it('returns 1 when first is newer', () => {
    expect(compareVersions('1.0.5', '1.0.4')).toBe(1)
  })

  it('handles minor version differences', () => {
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1)
  })

  it('handles major version differences', () => {
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1)
  })

  it('handles different length versions', () => {
    expect(compareVersions('1.0', '1.0.1')).toBe(-1)
  })
})
