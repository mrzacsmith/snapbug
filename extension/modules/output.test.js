import { describe, it, expect } from 'vitest'
import { formatClipboardOutput } from './output.js'

describe('formatClipboardOutput', () => {
  it('formats markdown image tag only', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
    })
    expect(result).toBe('![screenshot](https://snap.workers.dev/2026/04/10/abc.png)')
  })

  it('includes page URL when provided', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      pageUrl: 'https://app.example.com/dashboard',
    })
    expect(result).toContain('URL: https://app.example.com/dashboard')
  })

  it('includes timestamp when provided', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      timestamp: '2026-04-10 14:32 UTC',
    })
    expect(result).toContain('Captured: 2026-04-10 14:32 UTC')
  })

  it('includes all metadata in correct order', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      pageUrl: 'https://app.example.com/dashboard',
      timestamp: '2026-04-10 14:32 UTC',
    })
    const lines = result.split('\n')
    expect(lines[0]).toBe('![screenshot](https://snap.workers.dev/2026/04/10/abc.png)')
    expect(lines[1]).toBe('URL: https://app.example.com/dashboard')
    expect(lines[2]).toBe('Captured: 2026-04-10 14:32 UTC')
  })
})
