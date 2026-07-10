// Production proxy for Mesh API (Vercel-style Node serverless function).
// The browser calls same-origin /api/mesh/*; this forwards to the real Mesh API
// with the key attached here, so the key never reaches the client and CORS is
// avoided. Mirrors the Vite dev proxy so /api/mesh works identically in dev and
// prod. Body parsing is disabled to pass multipart audio uploads and binary
// (TTS) responses through untouched.
export const config = { api: { bodyParser: false } }

const BASE = process.env.MESH_BASE_URL || 'https://api.meshapi.ai/v1'
const KEY = process.env.MESH_API_KEY

export default async function handler(req, res) {
  if (!KEY) {
    res.status(500).json({ error: 'MESH_API_KEY is not set on the server' })
    return
  }

  const parts = req.query.path
  const path = Array.isArray(parts) ? parts.join('/') : parts || ''

  // Get the request body. Depending on the platform/runtime the body may arrive
  // already parsed (Vercel parses JSON) or as a raw stream (multipart audio for
  // STT). Handle both: re-serialize a parsed object, otherwise drain the stream.
  let body
  if (req.body !== undefined && req.body !== null) {
    body =
      typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body)
  } else {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    body = chunks.length ? Buffer.concat(chunks) : undefined
  }

  const headers = { Authorization: `Bearer ${KEY}` }
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']

  const upstream = await fetch(`${BASE}/${path}`, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  })

  res.status(upstream.status)
  const type = upstream.headers.get('content-type')
  if (type) res.setHeader('content-type', type)
  res.send(Buffer.from(await upstream.arrayBuffer()))
}
