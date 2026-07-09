import { useEffect, useState } from 'react'
import { store, useStore } from '../lib/store'
import { ATTEND_THRESHOLD, computePay } from '../lib/pay'
import { MON, dateKey, fmtDay, inr, monthDays, isTue, ym } from '../lib/date'

export default function PayView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const y = cursor.getFullYear()
  const m0 = cursor.getMonth()
  const stepM = (n: number) => setCursor(new Date(y, m0 + n, 1))
  const month = ym(cursor)
  const isCurMonth = month === ym(new Date())
  const tuesdays = monthDays(cursor).filter(isTue).length

  const [sel, setSel] = useState(data.staff[0] || '')
  useEffect(() => {
    if (!data.staff.includes(sel)) setSel(data.staff[0] || '')
  }, [data.staff, sel])

  const [amt, setAmt] = useState('')
  const [note, setNote] = useState('')
  const [advDate, setAdvDate] = useState(isCurMonth ? dateKey(new Date()) : `${month}-01`)
  useEffect(() => setAdvDate(isCurMonth ? dateKey(new Date()) : `${month}-01`), [month, isCurMonth])

  const pay = sel ? computePay(data, cursor, sel) : null
  const advList = data.advances
    .filter((a) => a.staff === sel && a.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date))

  const progress = pay ? Math.min(pay.attended / ATTEND_THRESHOLD, 1) : 0
  const remaining = pay ? Math.max(0, Math.ceil(ATTEND_THRESHOLD - pay.attended)) : 0

  const addAdv = () => {
    const v = Math.round(Number(amt) || 0)
    if (!sel || v <= 0) return
    store.addAdvance(sel, v, note.trim(), advDate)
    setAmt('')
    setNote('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => stepM(-1)} className="nav-btn">‹</button>
        <div className="text-lg font-semibold">{MON[m0]} {y}</div>
        <button onClick={() => stepM(1)} className="nav-btn">›</button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-muted">Worker</label>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-card2 px-3 py-2 text-sm font-bold outline-none focus:border-brand"
        >
          {data.staff.map((n) => (
            <option key={n} value={n} className="bg-card">{n}</option>
          ))}
        </select>
      </div>

      {pay && (
        <>
          <div className="rounded-2xl border border-line bg-gradient-to-br from-card2 to-card p-4 text-center">
            <div className="text-xs font-semibold text-muted">{sel}&rsquo;s take-home this month</div>
            <div className="my-1 text-4xl font-black tracking-normal text-brand">{inr(pay.net)}</div>
            <div className="text-xs font-bold text-fg">{pay.attended} / {ATTEND_THRESHOLD} days present</div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted/20">
              <span
                className={`block h-full rounded-full ${pay.unlocked ? 'bg-brand' : 'bg-half'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className={`mt-2 text-xs font-semibold ${pay.unlocked ? 'text-brand' : 'text-half'}`}>
              {pay.rate <= 0
                ? 'Set a daily rate below.'
                : pay.unlocked
                  ? `Tuesday pay unlocked — extra ${inr(pay.tueBonus)} this month.`
                  : `Attend ${remaining} more day${remaining === 1 ? '' : 's'} to unlock ${inr(tuesdays * pay.rate)} Tuesday pay.`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Rate name={sel} rate={pay.rate} />
            <Stat label={`Base (${pay.paidDays}d)`} value={inr(pay.base)} />
            <Stat label={`Tuesdays (${tuesdays})`} value={pay.unlocked ? inr(pay.tueBonus) : '-'} />
            <Stat label="Advances" value={pay.advTotal ? `- ${inr(pay.advTotal)}` : inr(0)} neg={pay.advTotal > 0} />
          </div>

          <div className="rounded-xl border border-line bg-card2 p-3">
            <div className="mb-2 text-sm font-extrabold tracking-[0.12em] text-muted uppercase">Add advance</div>
            <div className="flex flex-wrap gap-2">
              <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} className="rounded-[10px] border border-line bg-card px-2 py-2 text-sm outline-none focus:border-brand" />
              <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount ₹" className="w-24 rounded-[10px] border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note" className="min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand" />
              <button onClick={addAdv} className="rounded-[10px] bg-brand px-4 text-sm font-extrabold text-ink active:brightness-95">Add</button>
            </div>
            {advList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {advList.map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-3 pr-2 text-xs font-semibold">
                    {inr(a.amount)}{a.note ? ` · ${a.note}` : ''} <em className="not-italic text-muted">{fmtDay(a.date)}</em>
                    <button onClick={() => store.removeAdvance(a.id)} className="text-muted hover:text-absent">x</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, neg }: { label: string; value: string; neg?: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-card2 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-bold ${neg ? 'text-absent' : ''}`}>{value}</div>
    </div>
  )
}

function Rate({ name, rate }: { name: string; rate: number }) {
  return (
    <div className="rounded-[10px] border border-line bg-card2 px-3 py-2">
      <div className="text-xs text-muted">Daily rate</div>
      <div className="flex items-center font-semibold">
        ₹
        <input
          type="number"
          defaultValue={rate || ''}
          placeholder="0"
          onBlur={(e) => {
            const v = Math.max(0, Math.round(Number(e.target.value) || 0))
            if (v !== rate) store.setRate(name, v)
          }}
          className="w-16 bg-transparent outline-none"
        />
      </div>
    </div>
  )
}
