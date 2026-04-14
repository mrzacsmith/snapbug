import { describe, it, expect, vi, beforeEach } from 'vitest'
import { summarizeConsole } from './ai-summary.js'

describe('summarizeConsole', () => {
  let mockFetch

  beforeEach(() => {
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  it('calls OpenRouter API with correct endpoint and headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Summary: 2 errors found' } }],
      }),
    })

    await summarizeConsole('❌ TypeError\n⚠️ Deprecation', 'test-api-key')

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(opts.headers['Authorization']).toBe('Bearer test-api-key')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('returns the summary text from the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '2 errors: TypeError and fetch 404' } }],
      }),
    })

    const result = await summarizeConsole('❌ TypeError\n❌ fetch 404', 'key')
    expect(result).toBe('2 errors: TypeError and fetch 404')
  })

  it('returns null when API key is missing', async () => {
    const result = await summarizeConsole('some logs', '')
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns null when console text is empty', async () => {
    const result = await summarizeConsole('', 'key')
    expect(result).toBeNull()
  })

  it('returns null on API error (graceful fallback)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'server error' }),
    })

    const result = await summarizeConsole('❌ Error', 'key')
    expect(result).toBeNull()
  })

  it('returns null on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))

    const result = await summarizeConsole('❌ Error', 'key')
    expect(result).toBeNull()
  })

  it('truncates very long input', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'summary' } }],
      }),
    })

    const longLog = 'x'.repeat(20000)
    await summarizeConsole(longLog, 'key')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userContent = body.messages[1].content
    expect(userContent.length).toBeLessThanOrEqual(8200)
  })
})
