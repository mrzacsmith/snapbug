import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRecorder } from './recorder.js'

function makeChromeStub({ streamId = 'stream-123' } = {}) {
  const storage = {}
  return {
    tabCapture: {
      getMediaStreamId: vi.fn((opts, cb) => cb(streamId)),
    },
    offscreen: {
      createDocument: vi.fn(() => Promise.resolve()),
      hasDocument: vi.fn(() => Promise.resolve(false)),
      Reason: { USER_MEDIA: 'USER_MEDIA' },
    },
    runtime: {
      sendMessage: vi.fn((msg, cb) => {
        if (msg.action === 'start-recording') cb({ ok: true })
        if (msg.action === 'stop-recording') cb({ dataUrl: 'data:video/webm;base64,abc' })
      }),
      getURL: vi.fn((path) => `chrome-extension://abc123/${path}`),
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
    },
    storage: {
      local: {
        set: vi.fn((data, cb) => {
          Object.assign(storage, data)
          cb && cb()
        }),
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
    _storage: storage,
  }
}

describe('createRecorder', () => {
  it('returns an object with start, stop, and isRecording', () => {
    const recorder = createRecorder(makeChromeStub())
    expect(recorder.start).toBeInstanceOf(Function)
    expect(recorder.stop).toBeInstanceOf(Function)
    expect(recorder.isRecording()).toBe(false)
  })

  it('start sets recording state to true', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    expect(recorder.isRecording()).toBe(true)
  })

  it('start creates offscreen document if not present', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    expect(chrome.offscreen.createDocument).toHaveBeenCalledOnce()
  })

  it('start does not recreate offscreen document if already present', async () => {
    const chrome = makeChromeStub()
    chrome.offscreen.hasDocument.mockResolvedValue(true)
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled()
  })

  it('start gets media stream id for the target tab', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(42)
    expect(chrome.tabCapture.getMediaStreamId).toHaveBeenCalledWith(
      { targetTabId: 42 },
      expect.any(Function)
    )
  })

  it('start sends start-recording message to offscreen', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { target: 'offscreen', action: 'start-recording', streamId: 'stream-123', audio: false },
      expect.any(Function)
    )
  })

  it('start sets badge to REC', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#e53e3e' })
  })

  it('stop sends stop-recording message and returns data URL', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    const result = await recorder.stop()
    expect(result).toBe('data:video/webm;base64,abc')
    expect(recorder.isRecording()).toBe(false)
  })

  it('stop clears badge', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    await recorder.stop()
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
  })

  it('stop throws if not recording', async () => {
    const recorder = createRecorder(makeChromeStub())
    await expect(recorder.stop()).rejects.toThrow('Not recording')
  })

  it('start throws if already recording', async () => {
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    await expect(recorder.start(1)).rejects.toThrow('Already recording')
  })

  it('enforces max duration via auto-stop', async () => {
    vi.useFakeTimers()
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome, { maxDurationMs: 1000 })
    const onAutoStop = vi.fn()
    recorder.onAutoStop = onAutoStop

    await recorder.start(1)
    await vi.advanceTimersByTimeAsync(1000)

    expect(recorder.isRecording()).toBe(false)
    expect(onAutoStop).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('getElapsed returns time since recording started', async () => {
    vi.useFakeTimers()
    const chrome = makeChromeStub()
    const recorder = createRecorder(chrome)
    await recorder.start(1)
    vi.advanceTimersByTime(5000)
    expect(recorder.getElapsed()).toBe(5000)
    vi.useRealTimers()
  })
})
