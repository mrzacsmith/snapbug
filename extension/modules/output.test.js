import { describe, it, expect } from 'vitest'
import { formatClipboardOutput } from './output.js'

describe('formatClipboardOutput', () => {
  it('formats markdown image tag', () => {
    const result = formatClipboardOutput({
      imageUrl: 'https://snap.workers.dev/2026/04/10/abc.png',
    })
    expect(result).toBe('![screenshot](https://snap.workers.dev/2026/04/10/abc.png)')
  })
})
