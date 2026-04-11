const ALLOWED_ORIGINS = [
  'chrome-extension://aafdgjcfokgognkkhhcmdajmkelghoob',
]

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin)
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  }
}

function jsonResponse(body, status = 200, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function generateKey() {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 10)
  return `${yyyy}/${mm}/${dd}/${ts}-${rand}.png`
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const method = request.method
    const origin = request.headers.get('Origin')

    if (method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 })
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (method === 'GET' && url.pathname === '/') {
      return jsonResponse({ ok: true })
    }

    if (method === 'POST' && url.pathname === '/upload') {
      if (origin && !isAllowedOrigin(origin)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const apiKey = request.headers.get('X-API-Key')
      if (!apiKey || apiKey !== env.API_KEY) {
        return jsonResponse({ error: 'Unauthorized' }, 401, origin)
      }

      let formData
      try {
        formData = await request.formData()
      } catch {
        return jsonResponse({ error: 'Invalid form data' }, 400, origin)
      }

      const image = formData.get('image')
      if (!image) {
        return jsonResponse({ error: 'Missing image field' }, 400, origin)
      }

      if (image.type !== 'image/png') {
        return jsonResponse({ error: 'Only PNG uploads are accepted' }, 400, origin)
      }

      const arrayBuffer = await image.arrayBuffer()
      const MAX_SIZE = 5 * 1024 * 1024
      if (arrayBuffer.byteLength > MAX_SIZE) {
        return jsonResponse({ error: 'File exceeds 5MB size limit' }, 400, origin)
      }

      const key = generateKey()

      await env.SCREENSHOTS.put(key, arrayBuffer, {
        httpMetadata: { contentType: 'image/png' },
      })

      const imageUrl = `${url.origin}/${key}`
      return jsonResponse({ url: imageUrl, key }, 200, origin)
    }

    if (method === 'GET') {
      const key = url.pathname.slice(1)
      if (!key) {
        return jsonResponse({ error: 'Not found' }, 404)
      }

      const object = await env.SCREENSHOTS.get(key)
      if (!object) {
        return jsonResponse({ error: 'Not found' }, 404)
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=5184000',
          ...corsHeaders(),
        },
      })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  },
}
