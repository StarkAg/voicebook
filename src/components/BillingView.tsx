import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRecorder } from '../lib/useRecorder'
import { transcribe, meshConfigured } from '../lib/mesh'
import { parseBill, billTotal } from '../lib/bill'
import { upiLink, upiQrDataUrl, stripDataUrl, UPI_VPA } from '../lib/upi'
import { inr } from '../lib/date'
import { getToken } from '../lib/auth'
import WhatsAppConnect from './WhatsAppConnect'
import type { BillItem } from '../lib/types'

// WhatsApp needs a country-coded number with no symbols; default to India (91).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1)
  return digits
}

function billText(name: string, items: BillItem[], total: number): string {
  const lines = items.map((i) => `• ${i.name} ×${i.qty} — ₹${i.amount}`)
  return [
    `🧾 *VoiceBook Bill*`,
    name ? `Grahak: ${name}` : '',
    '',
    ...lines,
    '',
    `*Total: ₹${total}*`,
    'Dhanyawaad! 🙏',
  ]
    .filter((l) => l !== '')
    .join('\n')
}

export default function BillingView() {
  const rec = useRecorder()
  const [items, setItems] = useState<BillItem[]>([])
  const [thinking, setThinking] = useState(false)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [qr, setQr] = useState('')
  const [toast, setToast] = useState('')

  const enqueue = useMutation(api.outbox.enqueue)
  const createBill = useMutation(api.bills.create)
  const upsertCustomer = useMutation(api.customers.upsert)
  const createPayment = useMutation(api.payments.create)

  const configured = meshConfigured()
  const total = billTotal(items)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }

  const onMic = async () => {
    if (thinking) return
    if (rec.recording) {
      const blob = await rec.stop()
      if (!blob) return
      setThinking(true)
      try {
        const text = await transcribe(blob)
        const parsed = await parseBill(text)
        if (parsed.length) setItems((cur) => [...cur, ...parsed])
        else flash('Kuch samajh nahi aaya, dobara boliye.')
      } catch {
        flash('Awaaz samajh nahi aayi.')
      } finally {
        setThinking(false)
      }
    } else {
      await rec.start()
    }
  }

  const updateItem = (idx: number, patch: Partial<BillItem>) => {
    setItems((cur) =>
      cur.map((it, i) => {
        if (i !== idx) return it
        const next = { ...it, ...patch }
        next.amount = Number((next.qty * next.unitPrice).toFixed(2))
        return next
      }),
    )
  }
  const addRow = () => setItems((cur) => [...cur, { name: '', qty: 1, unitPrice: 0, amount: 0 }])
  const removeRow = (idx: number) => setItems((cur) => cur.filter((_, i) => i !== idx))

  const validCustomer = custName.trim() && normalizePhone(custPhone).length >= 11

  const sendBill = async () => {
    if (!items.length) return flash('Pehle bill banaiye.')
    if (!validCustomer) return flash('Grahak ka naam aur sahi number daaliye.')
    const phone = normalizePhone(custPhone)
    const token = getToken() ?? ''
    await upsertCustomer({ token, name: custName.trim(), phone })
    await createBill({
      token,
      customerName: custName.trim(),
      customerPhone: phone,
      items,
      total,
      status: 'sent',
    })
    await enqueue({ token, to: phone, text: billText(custName.trim(), items, total) })
    flash('Bill WhatsApp par bhej diya ✓')
  }

  const sendPayRequest = async () => {
    const amount = Number(payAmount) || total
    if (!amount) return flash('Amount daaliye.')
    if (!validCustomer) return flash('Grahak ka naam aur sahi number daaliye.')
    const phone = normalizePhone(custPhone)
    const note = `Payment to ${custName.trim() || 'VoiceBook'}`
    const link = upiLink({ amount, note })
    const dataUrl = await upiQrDataUrl(link)
    setQr(dataUrl)
    const token = getToken() ?? ''
    await upsertCustomer({ token, name: custName.trim(), phone })
    await createPayment({
      token,
      customerName: custName.trim(),
      customerPhone: phone,
      amount,
      vpa: UPI_VPA,
      upiLink: link,
      note,
      status: 'sent',
    })
    await enqueue({
      token,
      to: phone,
      text: `💰 *Payment request: ₹${amount}*\nPay via UPI: ${link}\nYa neeche QR scan karein 👇`,
      imageBase64: stripDataUrl(dataUrl),
    })
    flash('Payment request bhej diya ✓')
  }

  return (
    <div className="space-y-4">
      <WhatsAppConnect />

      {/* Voice composer */}
      <div className="rounded-2xl border border-line bg-card2 p-3">
        <div className="mb-2 text-sm font-bold text-fg">Bill banayein — bolkar ya likhkar</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMic}
            disabled={!configured || thinking}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
              rec.recording ? 'animate-pulse bg-absent text-white' : 'bg-brand text-ink'
            }`}
            title={configured ? 'Tap to speak items' : 'Add VITE_MESH_API_KEY to enable voice'}
          >
            {thinking ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
            ) : (
              '🎤'
            )}
          </button>
          <span className="text-xs text-muted">
            {rec.recording ? 'Sun raha hoon…' : 'e.g. "do kilo cheeni 90, ek tel 150"'}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-fg">Items</div>
          <button onClick={addRow} className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-brand">
            + Row
          </button>
        </div>
        {items.length === 0 && <div className="py-4 text-center text-xs text-muted">Koi item nahi. Bolein ya + Row.</div>}
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="Item"
                className="min-w-0 flex-1 rounded-lg border border-line bg-card2 px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
              <input
                type="number"
                value={it.qty}
                onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                className="w-12 rounded-lg border border-line bg-card2 px-1.5 py-1.5 text-center text-sm outline-none focus:border-brand"
              />
              <span className="text-xs text-muted">×</span>
              <input
                type="number"
                value={it.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                className="w-16 rounded-lg border border-line bg-card2 px-1.5 py-1.5 text-center text-sm outline-none focus:border-brand"
              />
              <span className="w-16 shrink-0 text-right text-sm font-semibold text-fg">{inr(it.amount)}</span>
              <button onClick={() => removeRow(idx)} className="px-1 text-muted hover:text-absent" title="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
            <span className="text-sm font-bold text-muted">Total</span>
            <span className="text-lg font-extrabold text-brand">{inr(total)}</span>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 text-sm font-bold text-fg">Grahak (Customer)</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            placeholder="Naam"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            inputMode="tel"
            placeholder="WhatsApp number"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          onClick={sendBill}
          className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-ink active:brightness-95"
        >
          Send bill on WhatsApp
        </button>
      </div>

      {/* Payment request */}
      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 text-sm font-bold text-fg">Purana payment maangein (UPI)</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={total ? String(total) : 'Amount ₹'}
            className="min-w-0 flex-1 rounded-lg border border-line bg-card2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={sendPayRequest}
            className="shrink-0 rounded-xl border border-brand bg-brand/10 px-3 py-2 text-sm font-bold text-brand"
          >
            Request payment
          </button>
        </div>
        {qr && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <img src={qr} alt="UPI QR" className="h-40 w-40 rounded-lg bg-white p-2" />
            <span className="text-[10px] text-muted">{UPI_VPA}</span>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-fg px-4 py-2 text-xs font-bold text-bg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
