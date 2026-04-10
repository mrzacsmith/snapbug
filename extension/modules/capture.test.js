import { describe, it, expect, vi } from 'vitest'
import { captureAndOpen, loadPendingScreenshot, clearPendingScreenshot } from './capture.js'

function makeChromeStub({ captureResult = 'data:image/png;base64,abc', lastError = null } = {}) {
  const storage = {}
  return {
    tabs: {
      captureVisibleTab: vi.fn((windowId, opts, cb) => {
        if (lastError) {
          chrome.runtime.lastError = lastError
        }
        cb(captureResult)
        chrome.runtime.lastError = null
      }),
      create: vi.fn((opts, cb) => cb && cb({ id: 1 })),
    },
    runtime: {
      lastError: null,
      getURL: vi.fn((path) => `chrome-extension://abc123/${path}`),
    },
    storage: {
      local: {
        set: vi.fn((data, cb) => {
          Object.assign(storage, data)
          cb && cb()
        }),
        get: vi.fn((key, cb) => {
          const result = {}
          if (storage[key] !== undefined) result[key] = storage[key]
          cb(result)
        }),
        remove: vi.fn((key, cb) => {
          delete storage[key]
          cb && cb()
        }),
      },
    },
    _storage: storage,
  }
}

// Keep a reference for the captureVisibleTab callback to read lastError
let chrome

describe('captureAndOpen', () => {
  it('captures visible tab, stores data URL, and opens annotate tab', async () => {
    chrome = makeChromeStub()
    const result = await captureAndOpen(chrome)

    expect(result).toEqual({ success: true })
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(null, { format: 'png' }, expect.any(Function))
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { pendingScreenshot: 'data:image/png;base64,abc' },
      expect.any(Function)
    )
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: 'chrome-extension://abc123/annotate.html' },
      expect.any(Function)
    )
  })

  it('rejects when captureVisibleTab fails', async () => {
    chrome = makeChromeStub({ lastError: { message: 'Cannot capture' }, captureResult: undefined })
    await expect(captureAndOpen(chrome)).rejects.toThrow('Cannot capture')
  })

  it('rejects when no data URL received', async () => {
    chrome = makeChromeStub({ captureResult: null })
    await expect(captureAndOpen(chrome)).rejects.toThrow('No screenshot data received')
  })
})

describe('loadPendingScreenshot', () => {
  it('returns the stored data URL', async () => {
    chrome = makeChromeStub()
    chrome._storage.pendingScreenshot = 'data:image/png;base64,xyz'
    const result = await loadPendingScreenshot(chrome)
    expect(result).toBe('data:image/png;base64,xyz')
  })

  it('returns null when no screenshot stored', async () => {
    chrome = makeChromeStub()
    const result = await loadPendingScreenshot(chrome)
    expect(result).toBeNull()
  })
})

describe('clearPendingScreenshot', () => {
  it('removes pending screenshot from storage', async () => {
    chrome = makeChromeStub()
    chrome._storage.pendingScreenshot = 'data:image/png;base64,xyz'
    await clearPendingScreenshot(chrome)
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('pendingScreenshot', expect.any(Function))
  })
})
