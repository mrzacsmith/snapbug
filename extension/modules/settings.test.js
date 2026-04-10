import { describe, it, expect, vi } from 'vitest'
import { getSettings, saveSettings, isConfigured, validateWorkerUrl } from './settings.js'

function makeChromeStub(initialData = {}) {
  const storage = { ...initialData }
  return {
    storage: {
      local: {
        get: vi.fn((keys, cb) => {
          const result = {}
          const keyList = Array.isArray(keys) ? keys : [keys]
          for (const k of keyList) {
            if (storage[k] !== undefined) result[k] = storage[k]
          }
          cb(result)
        }),
        set: vi.fn((data, cb) => {
          Object.assign(storage, data)
          cb && cb()
        }),
      },
    },
    _storage: storage,
  }
}

describe('getSettings', () => {
  it('returns stored workerUrl and apiKey', async () => {
    const chrome = makeChromeStub({ workerUrl: 'https://snap.workers.dev', apiKey: 'secret123' })
    const settings = await getSettings(chrome)
    expect(settings).toEqual({ workerUrl: 'https://snap.workers.dev', apiKey: 'secret123' })
  })

  it('returns empty strings when nothing stored', async () => {
    const chrome = makeChromeStub()
    const settings = await getSettings(chrome)
    expect(settings).toEqual({ workerUrl: '', apiKey: '' })
  })
})

describe('saveSettings', () => {
  it('persists workerUrl and apiKey to storage', async () => {
    const chrome = makeChromeStub()
    await saveSettings(chrome, { workerUrl: 'https://snap.workers.dev', apiKey: 'key1' })
    expect(chrome._storage.workerUrl).toBe('https://snap.workers.dev')
    expect(chrome._storage.apiKey).toBe('key1')
  })
})

describe('isConfigured', () => {
  it('returns true when both values are set', async () => {
    const chrome = makeChromeStub({ workerUrl: 'https://snap.workers.dev', apiKey: 'key1' })
    expect(await isConfigured(chrome)).toBe(true)
  })

  it('returns false when workerUrl is missing', async () => {
    const chrome = makeChromeStub({ apiKey: 'key1' })
    expect(await isConfigured(chrome)).toBe(false)
  })

  it('returns false when apiKey is missing', async () => {
    const chrome = makeChromeStub({ workerUrl: 'https://snap.workers.dev' })
    expect(await isConfigured(chrome)).toBe(false)
  })

  it('returns false when both are missing', async () => {
    const chrome = makeChromeStub()
    expect(await isConfigured(chrome)).toBe(false)
  })
})

describe('validateWorkerUrl', () => {
  it('accepts valid https URL', () => {
    expect(validateWorkerUrl('https://snapbug.workers.dev')).toBe(true)
  })

  it('accepts valid http URL', () => {
    expect(validateWorkerUrl('http://localhost:8787')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(validateWorkerUrl('')).toBe(false)
  })

  it('rejects non-URL string', () => {
    expect(validateWorkerUrl('not a url')).toBe(false)
  })
})
