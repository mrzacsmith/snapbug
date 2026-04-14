import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from './index.js'

// --- helpers ---

function makeBucket() {
  const store = new Map()
  return {
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
  }
}

function makeEnv(apiKey = 'test-key') {
  return {
    API_KEY: apiKey,
    SCREENSHOTS: makeBucket(),
    VIDEOS: makeBucket(),
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

function webmBlob(sizeBytes = 100) {
  const data = new Uint8Array(sizeBytes)
  // WebM magic bytes (EBML header)
  data[0] = 0x1a; data[1] = 0x45; data[2] = 0xdf; data[3] = 0xa3
  return new Blob([data], { type: 'video/webm' })
}

function makeUploadRequest(apiKey, blob, fieldName = 'image') {
  const form = new FormData()
  const filename = blob.type === 'video/webm' ? 'recording.webm' : 'screenshot.png'
  form.append(fieldName, blob, filename)
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

  it('includes open CORS header for GET', async () => {
    const res = await worker.fetch(makeRequest('GET', '/'), makeEnv())
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('OPTIONS', () => {
  it('returns 204 with CORS headers for allowed origin', async () => {
    const req = makeRequest('OPTIONS', '/upload', {
      headers: { 'Origin': 'chrome-extension://aafdgjcfokgognkkhhcmdajmkelghoob' },
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://aafdgjcfokgognkkhhcmdajmkelghoob')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-API-Key')
  })

  it('returns 403 for disallowed origin on upload', async () => {
    const req = makeRequest('OPTIONS', '/upload', {
      headers: { 'Origin': 'https://evil.com' },
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(403)
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

  it('includes CORS header for extension origin on success', async () => {
    const form = new FormData()
    form.append('image', pngBlob(), 'screenshot.png')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key', 'Origin': 'chrome-extension://aafdgjcfokgognkkhhcmdajmkelghoob' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('chrome-extension://aafdgjcfokgognkkhhcmdajmkelghoob')
  })

  it('returns 403 for disallowed origin on upload', async () => {
    const form = new FormData()
    form.append('image', pngBlob(), 'screenshot.png')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key', 'Origin': 'https://evil.com' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(403)
  })

  it('returns 400 for JPEG content type', async () => {
    const blob = new Blob([new Uint8Array(100)], { type: 'image/jpeg' })
    const form = new FormData()
    form.append('image', blob, 'screenshot.jpg')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/png/i)
  })

  it('returns 400 for WebP content type', async () => {
    const blob = new Blob([new Uint8Array(100)], { type: 'image/webp' })
    const form = new FormData()
    form.append('image', blob, 'screenshot.webp')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/png/i)
  })

  it('returns 400 for file over 5MB', async () => {
    const bigBlob = pngBlob(5 * 1024 * 1024 + 1)
    const req = makeUploadRequest('test-key', bigBlob)
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/5\s*MB|size/i)
  })

  it('accepts file exactly at 5MB', async () => {
    const exactBlob = pngBlob(5 * 1024 * 1024)
    const req = makeUploadRequest('test-key', exactBlob)
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(200)
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
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=2592000')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('returns 404 for non-existent key', async () => {
    const res = await worker.fetch(makeRequest('GET', '/2026/01/01/nope.png'), makeEnv())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})

describe('POST /upload (video)', () => {
  it('stores WebM in VIDEOS bucket and returns url + key', async () => {
    const env = makeEnv()
    const req = makeUploadRequest('test-key', webmBlob())
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBeDefined()
    expect(json.key).toMatch(/\.webm$/)
    expect(env.VIDEOS.put).toHaveBeenCalledOnce()
    expect(env.SCREENSHOTS.put).not.toHaveBeenCalled()
  })

  it('accepts video up to 100MB', async () => {
    const env = makeEnv()
    const blob = webmBlob(100 * 1024 * 1024)
    const req = makeUploadRequest('test-key', blob)
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
  })

  it('rejects video over 100MB', async () => {
    const blob = webmBlob(100 * 1024 * 1024 + 1)
    const req = makeUploadRequest('test-key', blob)
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/100\s*MB|size/i)
  })

  it('rejects unsupported content types', async () => {
    const blob = new Blob([new Uint8Array(100)], { type: 'video/mp4' })
    const form = new FormData()
    form.append('image', blob, 'recording.mp4')
    const req = makeRequest('POST', '/upload', {
      headers: { 'X-API-Key': 'test-key' },
      body: form,
    })
    const res = await worker.fetch(req, makeEnv())
    expect(res.status).toBe(400)
  })
})

describe('GET /<key> (video)', () => {
  it('returns stored video with correct headers', async () => {
    const env = makeEnv()
    const uploadRes = await worker.fetch(makeUploadRequest('test-key', webmBlob(200)), env)
    const { key } = await uploadRes.json()

    const res = await worker.fetch(makeRequest('GET', `/${key}`), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('video/webm')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=1209600')
  })

  it('returns 404 for non-existent video key', async () => {
    const res = await worker.fetch(makeRequest('GET', '/2026/01/01/nope.webm'), makeEnv())
    expect(res.status).toBe(404)
  })
})

describe('GET /watch/<key>', () => {
  it('returns HTML player page for video key', async () => {
    const env = makeEnv()
    env.VIDEOS._store.set('2026/04/10/test.webm', {
      body: new Uint8Array(10),
      opts: { httpMetadata: { contentType: 'video/webm' } },
    })

    const res = await worker.fetch(makeRequest('GET', '/watch/2026/04/10/test.webm'), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('<video')
    expect(html).toContain('2026/04/10/test.webm')
    expect(html).toContain('14 days')
  })

  it('returns 404 for non-existent video', async () => {
    const res = await worker.fetch(makeRequest('GET', '/watch/2026/01/01/nope.webm'), makeEnv())
    expect(res.status).toBe(404)
  })
})
