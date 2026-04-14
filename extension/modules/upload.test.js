import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadScreenshot, uploadVideo, dataUrlToBlob } from './upload.js'

describe('uploadScreenshot', () => {
  let mockFetch

  beforeEach(() => {
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  it('sends PNG blob with correct headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://snap.workers.dev/2026/04/10/abc.png', key: '2026/04/10/abc.png' }),
    })

    const blob = new Blob([new Uint8Array(100)], { type: 'image/png' })
    const result = await uploadScreenshot(blob, {
      workerUrl: 'https://snap.workers.dev',
      apiKey: 'test-key',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://snap.workers.dev/upload')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('test-key')
    expect(result.url).toBe('https://snap.workers.dev/2026/04/10/abc.png')
    expect(result.key).toBe('2026/04/10/abc.png')
  })

  it('rejects files over 5MB', async () => {
    const blob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' })
    await expect(
      uploadScreenshot(blob, { workerUrl: 'https://snap.workers.dev', apiKey: 'key' })
    ).rejects.toThrow(/5MB/)
  })

  it('throws on server error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal error' }),
    })

    const blob = new Blob([new Uint8Array(100)], { type: 'image/png' })
    await expect(
      uploadScreenshot(blob, { workerUrl: 'https://snap.workers.dev', apiKey: 'key' })
    ).rejects.toThrow(/Internal error/)
  })

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    const blob = new Blob([new Uint8Array(100)], { type: 'image/png' })
    await expect(
      uploadScreenshot(blob, { workerUrl: 'https://snap.workers.dev', apiKey: 'bad' })
    ).rejects.toThrow(/Unauthorized/)
  })

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const blob = new Blob([new Uint8Array(100)], { type: 'image/png' })
    await expect(
      uploadScreenshot(blob, { workerUrl: 'https://snap.workers.dev', apiKey: 'key' })
    ).rejects.toThrow(/Network error/)
  })
})

describe('uploadVideo', () => {
  let mockFetch

  beforeEach(() => {
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  it('sends WebM blob with correct headers and filename', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://snap.workers.dev/2026/04/10/abc.webm', key: '2026/04/10/abc.webm' }),
    })

    const blob = new Blob([new Uint8Array(100)], { type: 'video/webm' })
    const result = await uploadVideo(blob, {
      workerUrl: 'https://snap.workers.dev',
      apiKey: 'test-key',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://snap.workers.dev/upload')
    expect(opts.method).toBe('POST')
    expect(opts.headers['X-API-Key']).toBe('test-key')
    expect(result.url).toMatch(/\.webm$/)
  })

  it('rejects videos over 100MB', async () => {
    const blob = new Blob([new Uint8Array(100 * 1024 * 1024 + 1)], { type: 'video/webm' })
    await expect(
      uploadVideo(blob, { workerUrl: 'https://snap.workers.dev', apiKey: 'key' })
    ).rejects.toThrow(/100MB/)
  })

  it('accepts video at exactly 100MB', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://snap.workers.dev/abc.webm', key: 'abc.webm' }),
    })

    const blob = new Blob([new Uint8Array(100 * 1024 * 1024)], { type: 'video/webm' })
    const result = await uploadVideo(blob, {
      workerUrl: 'https://snap.workers.dev',
      apiKey: 'key',
    })
    expect(result.url).toBeDefined()
  })

  it('calls onProgress during upload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://snap.workers.dev/abc.webm', key: 'abc.webm' }),
    })

    const blob = new Blob([new Uint8Array(100)], { type: 'video/webm' })
    const onProgress = vi.fn()
    await uploadVideo(blob, {
      workerUrl: 'https://snap.workers.dev',
      apiKey: 'key',
      onProgress,
    })
    expect(onProgress).toHaveBeenCalled()
  })
})

describe('dataUrlToBlob', () => {
  it('converts a data URL to a Blob with correct type', () => {
    const dataUrl = 'data:video/webm;base64,AQID'
    const blob = dataUrlToBlob(dataUrl)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('video/webm')
    expect(blob.size).toBe(3)
  })

  it('converts a PNG data URL', () => {
    const dataUrl = 'data:image/png;base64,AQID'
    const blob = dataUrlToBlob(dataUrl)
    expect(blob.type).toBe('image/png')
  })
})
