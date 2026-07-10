import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import QRCode from 'qrcode'
import { api } from '../../convex/_generated/api'

// Live WhatsApp link panel. The Railway worker publishes its QR + status to
// Convex (wa.setStatus); this subscribes (wa.getStatus) and renders the QR so
// the shopkeeper can link WhatsApp from inside the app — no terminal needed.
export default function WhatsAppConnect() {
  const status = useQuery(api.wa.getStatus)
  const [open, setOpen] = useState(false)
  const [qrImg, setQrImg] = useState('')

  const state = status?.status ?? 'disconnected'
  const connected = state === 'connected'
  const qr = !connected ? status?.qr : undefined

  useEffect(() => {
    if (qr) {
      QRCode.toDataURL(qr, { margin: 1, width: 320 })
        .then(setQrImg)
        .catch(() => setQrImg(''))
    } else {
      setQrImg('')
    }
  }, [qr])

  const dot = connected ? 'bg-brand' : qr ? 'bg-half' : 'bg-absent'
  const label = connected
    ? 'Connected'
    : qr
      ? 'Scan to link'
      : state === 'connecting'
        ? 'Connecting…'
        : 'Not connected'

  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-fg">
          <span>📲 WhatsApp</span>
          <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
          <span className="text-xs font-semibold text-muted">{label}</span>
        </div>
        {!connected && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg border border-brand bg-brand/10 px-3 py-1 text-xs font-bold text-brand"
          >
            {open ? 'Hide' : 'Connect WhatsApp'}
          </button>
        )}
      </div>

      {!connected && open && (
        <div className="mt-3 flex flex-col items-center gap-2 border-t border-line pt-3">
          {qrImg ? (
            <>
              <img src={qrImg} alt="WhatsApp QR" className="h-52 w-52 rounded-lg bg-white p-2" />
              <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted">
                <li>Phone par WhatsApp kholein</li>
                <li>Settings → Linked devices → Link a device</li>
                <li>Yeh QR scan karein</li>
              </ol>
            </>
          ) : (
            <div className="py-6 text-center text-xs text-muted">
              {state === 'connecting'
                ? 'Connecting to WhatsApp…'
                : 'Worker se QR aa raha hai… (Railway worker chalu hona chahiye)'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
