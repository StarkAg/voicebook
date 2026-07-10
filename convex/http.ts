import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'

// Convex supports process.env at runtime but doesn't type it here.
declare const process: { env: Record<string, string | undefined> }

// Mesh API proxy as a Convex HTTP action (served at <deployment>.convex.site).
// The browser calls /mesh/*; this attaches the key server-side (never shipped to
// the client) and sets CORS so it works cross-origin from the Vercel frontend.
// Handles JSON (chat/TTS) and multipart (STT audio) + binary responses.
const MESH_BASE = process.env.MESH_BASE_URL || 'https://api.meshapi.ai/v1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const proxy = httpAction(async (_ctx, request) => {
  const key = process.env.MESH_API_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: 'MESH_API_KEY not set on Convex' }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...CORS },
    })
  }

  const subpath = new URL(request.url).pathname.replace(/^\/mesh\//, '')
  const headers = new Headers({ Authorization: `Bearer ${key}` })
  const ct = request.headers.get('content-type')
  if (ct) headers.set('content-type', ct)

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer()

  const upstream = await fetch(`${MESH_BASE}/${subpath}`, {
    method: request.method,
    headers,
    body,
  })

  const respHeaders = new Headers(CORS)
  const rct = upstream.headers.get('content-type')
  if (rct) respHeaders.set('content-type', rct)
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: respHeaders,
  })
})

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS }))

const http = httpRouter()
for (const method of ['POST', 'GET'] as const) {
  http.route({ pathPrefix: '/mesh/', method, handler: proxy })
}
http.route({ pathPrefix: '/mesh/', method: 'OPTIONS', handler: preflight })

export default http
