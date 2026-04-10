import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadScreenshot } from './upload.js'

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
