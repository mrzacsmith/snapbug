import { describe, it, expect, vi } from 'vitest'
import { loadPendingVideo, clearPendingVideo, buildWatchUrl } from './video-preview.js'

function makeChromeStub(storage = {}) {
  return {
    storage: {
      local: {
        get: vi.fn((keys, cb) => {
          const result = {}
          for (const key of [].concat(keys)) {
            if (storage[key] !== undefined) result[key] = storage[key]
          }
          cb(result)
        }),
        remove: vi.fn((keys, cb) => {
          for (const key of [].concat(keys)) delete storage[key]
          cb && cb()
        }),
      },
    },
  }
}

describe('loadPendingVideo', () => {
  it('returns video data URL and page URL from storage', async () => {
    const chrome = makeChromeStub({
      pendingVideo: 'data:video/webm;base64,abc',
      recordingPageUrl: 'https://example.com',
    })
    const result = await loadPendingVideo(chrome)
    expect(result.dataUrl).toBe('data:video/webm;base64,abc')
    expect(result.pageUrl).toBe('https://example.com')
  })

  it('returns null dataUrl when no pending video', async () => {
    const chrome = makeChromeStub({})
    const result = await loadPendingVideo(chrome)
    expect(result.dataUrl).toBeNull()
  })
})

describe('clearPendingVideo', () => {
  it('removes pendingVideo and recordingPageUrl from storage', async () => {
    const chrome = makeChromeStub({ pendingVideo: 'data:abc', recordingPageUrl: 'https://x.com' })
    await clearPendingVideo(chrome)
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
      ['pendingVideo', 'recordingPageUrl'],
      expect.any(Function)
    )
  })
})

describe('buildWatchUrl', () => {
  it('inserts /watch after the origin', () => {
    const url = 'https://snapbug.workers.dev/2026/04/14/abc.webm'
    expect(buildWatchUrl(url)).toBe('https://snapbug.workers.dev/watch/2026/04/14/abc.webm')
  })
})
