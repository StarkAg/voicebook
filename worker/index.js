import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi as api } from 'convex/server'
import { useConvexAuthState } from './convexAuthState.js'

const CONVEX_URL = process.env.CONVEX_URL
if (!CONVEX_URL) {
  console.error('CONVEX_URL env var is required (your Convex deployment URL).')
  process.exit(1)
}

const POLL_MS = Number(process.env.POLL_MS) || 2500
const client = new ConvexHttpClient(CONVEX_URL)
const logger = pino({ level: 'silent' })

let sock = null
let ready = false
const inFlight = new Set()

const jidFor = (phone) => `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`

async function sendRow(row) {
  if (inFlight.has(row._id)) return
  inFlight.add(row._id)
  try {
    const claimed = await client.mutation(api.outbox.claim, { id: row._id })
    if (!claimed) return
    const jid = jidFor(row.to)
    if (row.imageBase64) {
      await sock.sendMessage(jid, {
        image: Buffer.from(row.imageBase64, 'base64'),
        caption: row.text,
      })
    } else {
      await sock.sendMessage(jid, { text: row.text })
    }
    await client.mutation(api.outbox.markSent, { id: row._id })
    console.log(`→ sent to ${row.to}`)
  } catch (e) {
    await client.mutation(api.outbox.markFailed, {
      id: row._id,
      error: String(e?.message || e),
    })
    console.error(`✗ failed for ${row.to}: ${e?.message || e}`)
  } finally {
    inFlight.delete(row._id)
  }
}

async function drain() {
  if (!ready || !sock) return
  try {
    const rows = await client.query(api.outbox.pending, {})
    for (const row of rows) await sendRow(row)
  } catch (e) {
    console.error('drain error:', e?.message || e)
  }
}

async function start() {
  const { state, saveCreds } = await useConvexAuthState(client, api)
  const { version } = await fetchLatestBaileysVersion()
  sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n📱 Scan this QR in WhatsApp → Linked devices → Link a device:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') {
      ready = true
      console.log('✅ WhatsApp connected — draining outbox')
      drain()
    }
    if (connection === 'close') {
      ready = false
      const code = lastDisconnect?.error?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      console.log(`Connection closed (${code}) — ${loggedOut ? 'logged out' : 'reconnecting'}`)
      if (!loggedOut) start()
    }
  })
}

start().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})

// Poll the outbox as a steady heartbeat (simpler & more robust in Node than a
// long-lived websocket subscription).
setInterval(drain, POLL_MS)
