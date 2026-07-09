// Mesh API integration. Every AI call in VoiceBook routes through Mesh
// (https://api.meshapi.ai/v1) using the OpenAI-compatible interface.
//
// Pipeline: audio -> STT (Mesh) -> intent parsing (Mesh chat) -> action,
// with answers optionally spoken back via TTS (Mesh).

// Requests go to the same-origin '/mesh' path, which the Vite dev server proxies
// to the real Mesh API (see vite.config.ts). This avoids browser CORS blocks and
// lets the key be attached server-side. VITE_MESH_BASE_URL configures the proxy
// target, not the client fetch path.
const BASE_URL = '/mesh'
const API_KEY = import.meta.env.VITE_MESH_API_KEY as string | undefined

// Auto routing lets Mesh pick the cheapest capable model per task.
const CHAT_MODEL = (import.meta.env.VITE_MESH_CHAT_MODEL as string) || 'auto'
// Sarvam models are built for Indian languages - ideal for a Bharat voice app.
const STT_MODEL = (import.meta.env.VITE_MESH_STT_MODEL as string) || 'sarvam/saaras:v3'
const TTS_MODEL = (import.meta.env.VITE_MESH_TTS_MODEL as string) || 'sarvam/bulbul:v3'
const TTS_VOICE = (import.meta.env.VITE_MESH_TTS_VOICE as string) || 'anushka'

export class MeshError extends Error {}

function requireKey(): string {
  if (!API_KEY) {
    throw new MeshError('Missing VITE_MESH_API_KEY. Add your Mesh key (rsk_...) to .env.local')
  }
  return API_KEY
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${requireKey()}` }
}

// Speech -> text via Mesh audio transcription endpoint.
export async function transcribe(audio: Blob, language = 'hi'): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'clip.webm')
  form.append('model', STT_MODEL)
  form.append('language', language)

  const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) throw new MeshError(`Mesh STT failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return (data.text || '').trim()
}

interface ChatOptions {
  system: string
  user: string
  json?: boolean
  temperature?: number
}

// Text reasoning / intent parsing via Mesh chat completions.
export async function chat({ system, user, json, temperature = 0.2 }: ChatOptions): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new MeshError(`Mesh chat failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

// Text -> speech via Mesh audio speech endpoint. Returns an object URL.
export async function speak(text: string, voice = TTS_VOICE): Promise<string> {
  const res = await fetch(`${BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: TTS_MODEL, voice, input: text }),
  })
  if (!res.ok) throw new MeshError(`Mesh TTS failed (${res.status}): ${await res.text()}`)
  const buf = await res.arrayBuffer()
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

export const meshConfigured = () => Boolean(API_KEY)
