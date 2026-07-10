import { useState } from 'react'
import { requestOtp, verifyOtp } from '../lib/auth'

// Phone-number OTP login. OTP is sent via Fast2SMS (convex/auth.ts); a fixed
// dev code also works until the SMS key is live.
export default function LoginGate() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [devHint, setDevHint] = useState('')

  const digits = phone.replace(/\D/g, '')

  const send = async () => {
    if (digits.length < 10) {
      setMsg('Sahi 10-digit number daalein')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const res = await requestOtp(digits)
      if (!res.ok) {
        if (res.error === 'rate_limited') {
          const s = res.retryAfter ?? 30
          setMsg(s > 90 ? `Bahut requests — thodi der baad try karein` : `Ruko — ${s}s baad dobara try karein`)
        } else {
          setMsg('Sahi 10-digit number daalein')
        }
        return
      }
      setDevHint(res.devHint || '')
      setStep('code')
    } catch {
      setMsg('OTP bhejne mein dikkat, dobara try karein')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (code.trim().length < 4) return
    setBusy(true)
    setMsg('')
    try {
      const res = await verifyOtp(digits, code.trim())
      if (!res) setMsg('Galat ya expired OTP')
      // on success, useAuth re-renders App and shows the app
    } catch {
      setMsg('Verify mein dikkat')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[420px] flex-col justify-center px-6 py-16 text-fg">
      <div className="mb-8 text-center">
        <div className="text-3xl font-extrabold leading-tight">
          Voice<span className="text-brand">Book</span>
        </div>
        <div className="mt-1 text-xs font-semibold text-muted">
          Bolkar attendance, hisaab &amp; bills — Powered by Mesh
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        {step === 'phone' ? (
          <>
            <label className="text-sm font-bold text-fg">Phone number</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-card2 px-3">
              <span className="text-sm text-muted">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                inputMode="tel"
                autoFocus
                placeholder="10-digit mobile"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted"
              />
            </div>
            <button
              onClick={send}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-ink active:brightness-95 disabled:opacity-50"
            >
              {busy ? 'Bhej rahe hain…' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <label className="text-sm font-bold text-fg">OTP daalein</label>
            <div className="mt-1 text-xs text-muted">+91 {digits} par bheja gaya</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              inputMode="numeric"
              autoFocus
              placeholder="6-digit code"
              className="mt-2 w-full rounded-xl border border-line bg-card2 px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-brand"
            />
            <button
              onClick={verify}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-ink active:brightness-95 disabled:opacity-50"
            >
              {busy ? 'Check kar rahe hain…' : 'Verify & Login'}
            </button>
            <button
              onClick={() => {
                setStep('phone')
                setCode('')
                setMsg('')
              }}
              className="mt-2 w-full text-center text-xs font-semibold text-muted"
            >
              ← Number badlein
            </button>
            {devHint && (
              <div className="mt-3 rounded-lg border border-half/30 bg-half/10 px-3 py-2 text-center text-xs text-half">
                Dev mode: OTP <b>{devHint}</b> use karein (SMS abhi off hai)
              </div>
            )}
          </>
        )}
        {msg && <div className="mt-3 text-center text-xs font-semibold text-absent">{msg}</div>}
      </div>
    </div>
  )
}
