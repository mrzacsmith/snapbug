function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
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

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (method === 'GET' && url.pathname === '/') {
      return jsonResponse({ ok: true })
    }

    if (method === 'POST' && url.pathname === '/upload') {
      const apiKey = request.headers.get('X-API-Key')
      if (!apiKey || apiKey !== env.API_KEY) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      let formData
      try {
        formData = await request.formData()
      } catch {
        return jsonResponse({ error: 'Invalid form data' }, 400)
      }

      const image = formData.get('image')
      if (!image) {
        return jsonResponse({ error: 'Missing image field' }, 400)
      }

      const key = generateKey()
      const arrayBuffer = await image.arrayBuffer()

      await env.SCREENSHOTS.put(key, arrayBuffer, {
        httpMetadata: { contentType: 'image/png' },
      })

      const imageUrl = `${url.origin}/${key}`
      return jsonResponse({ url: imageUrl, key })
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
          'Cache-Control': 'public, max-age=31536000, immutable',
          ...corsHeaders(),
        },
      })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  },
}
