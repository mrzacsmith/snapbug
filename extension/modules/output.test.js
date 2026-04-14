import { describe, it, expect } from 'vitest'
import * as outputModule from './output.js'
const { formatClipboardOutput, formatVideoClipboardOutput } = outputModule

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

  it('does not include undefined values in output', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      pageUrl: undefined,
      timestamp: undefined,
    })
    expect(result).not.toContain('undefined')
    expect(result).not.toContain('URL:')
    expect(result).not.toContain('Captured:')
  })

  it('does not include empty string values in output', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      pageUrl: '',
      timestamp: '',
    })
    expect(result).not.toContain('URL:')
    expect(result).not.toContain('Captured:')
  })
})

describe('copyToClipboard', () => {
  it('is exported as a function', () => {
    expect(typeof outputModule.copyToClipboard).toBe('function')
  })
})

describe('formatUrlOnly', () => {
  it('returns only the raw image URL', () => {
    const result = outputModule.formatUrlOnly({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
      pageUrl: 'https://app.example.com/dashboard',
      timestamp: '2026-04-10 14:32 UTC',
    })
    expect(result).toBe('https://snap.workers.dev/2026/04/10/abc.png')
  })

  it('returns the image URL even without metadata', () => {
    const result = outputModule.formatUrlOnly({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
    })
    expect(result).toBe('https://snap.workers.dev/2026/04/10/abc.png')
  })
})

describe('formatVideoClipboardOutput', () => {
  it('formats video link using /watch/ player URL', () => {
    const result = formatVideoClipboardOutput({
      videoUrl: 'https://snap.workers.dev/watch/2026/04/10/abc.webm',
    })
    expect(result).toContain('/watch/')
    expect(result).not.toContain('![')
  })

  it('includes page URL when provided', () => {
    const result = formatVideoClipboardOutput({
      videoUrl: 'https://snap.workers.dev/2026/04/10/abc.webm',
      pageUrl: 'https://app.example.com/dashboard',
    })
    expect(result).toContain('URL: https://app.example.com/dashboard')
  })

  it('includes timestamp when provided', () => {
    const result = formatVideoClipboardOutput({
      videoUrl: 'https://snap.workers.dev/2026/04/10/abc.webm',
      timestamp: '2026-04-10 14:32 UTC',
    })
    expect(result).toContain('Recorded: 2026-04-10 14:32 UTC')
  })

  it('includes expiration notice', () => {
    const result = formatVideoClipboardOutput({
      videoUrl: 'https://snap.workers.dev/2026/04/10/abc.webm',
    })
    expect(result).toMatch(/expires|14 days/i)
  })
})
