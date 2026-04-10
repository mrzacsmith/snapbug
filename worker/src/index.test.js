import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from './index.js'

// --- helpers ---

function makeEnv(apiKey = 'test-key') {
  const store = new Map()
  return {
    API_KEY: apiKey,
    SCREENSHOTS: {
      put: vi.fn(async (key, body, opts) => {
        store.set(key, { body, opts })
      }),
      get: vi.fn(async (key) => {
        const entry = store.get(key)
        if (!entry) return null
        return {
          body: entry.body,
          httpMetadata: entry.opts?.httpMetadata || {},
        }
      }),
      _store: store,
    },
  }
}

function makeRequest(method, path, { headers = {}, body = null } = {}) {
  const url = `https://snapbug.example.workers.dev${path}`
  return new Request(url, { method, headers, body })
}

function pngBlob(sizeBytes = 100) {
  // Minimal PNG-like blob with correct magic bytes
  const data = new Uint8Array(sizeBytes)
  // PNG signature
  data[0] = 0x89; data[1] = 0x50; data[2] = 0x4e; data[3] = 0x47
  data[4] = 0x0d; data[5] = 0x0a; data[6] = 0x1a; data[7] = 0x0a
  return new Blob([data], { type: 'image/png' })
}

function makeUploadRequest(apiKey, blob) {
  const form = new FormData()
  form.append('image', blob, 'screenshot.png')
  return makeRequest('POST', '/upload', {
    headers: { 'X-API-Key': apiKey },
    body: form,
  })
}

// --- tests ---

describe('GET /', () => {
  it('returns health check JSON', async () => {
    const res = await worker.fetch(makeRequest('GET', '/'), makeEnv())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })

  it('includes CORS header', async () => {
    const res = await worker.fetch(makeRequest('GET', '/'), makeEnv())
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('OPTIONS', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await worker.fetch(makeRequest('OPTIONS', '/upload'), makeEnv())
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
  })
})

describe('POST /upload', () => {
  it('returns 401 without API key', async () => {
    const req = makeRequest('POST', '/upload')
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 401 with wrong API key', async () => {
    const req = makeUploadRequest('wrong-key', pngBlob())
    const res = await worker.fetch(req, makeEnv('correct-key'))
    expect(res.status).toBe(401)
  })

  it('returns 400 without image field', async () => {
    const form = new FormData()
    form.append('file', pngBlob(), 'screenshot.png')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('stores PNG in R2 and returns url + key', async () => {
    const env = makeEnv()
    const req = makeUploadRequest('test-key', pngBlob())
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBeDefined()
    expect(json.key).toBeDefined()
    expect(json.key).toMatch(/^\d{4}\/\d{2}\/\d{2}\/\d+-[a-z0-9]{8}\.png$/)
    expect(env.SCREENSHOTS.put).toHaveBeenCalledOnce()
  })

  it('includes CORS header on success', async () => {
    const res = await worker.fetch(makeUploadRequest('test-key', pngBlob()), makeEnv())
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('includes CORS header on auth failure', async () => {
    const req = makeRequest('POST', '/upload')
    const res = await worker.fetch(req, makeEnv())
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('GET /<key>', () => {
  it('returns stored image with correct headers', async () => {
    const env = makeEnv()
    // Upload first
    const uploadRes = await worker.fetch(makeUploadRequest('test-key', pngBlob(200)), env)
    const { key } = await uploadRes.json()

    // Now fetch
    const res = await worker.fetch(makeRequest('GET', `/${key}`), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 404 for non-existent key', async () => {
    const res = await worker.fetch(makeRequest('GET', '/2026/01/01/nope.png'), makeEnv())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
