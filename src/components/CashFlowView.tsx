import { useMemo, useState } from 'react'
import { store, useStore } from '../lib/store'
import { MON, dateKey, fmtDay, inr, ym } from '../lib/date'
import type { CashEntry } from '../lib/types'

const OUT_HINT = /\b(expense|fare|tempo|rent|purchase|paid|payment|diesel|petrol|transport|tea|chai|kharcha|kharach|out)\b/i

function parseEntry(raw: string): { kind: CashEntry['kind']; amount: number; note: string } | null {
  const text = raw.trim()
  const match = text.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const amount = Math.round(Number(match[1]))
  if (amount <= 0) return null
  const note = text
    .replace(match[0], '')
    .replace(/\b(rs|inr|rupees|rupaye|₹)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    kind: OUT_HINT.test(note) ? 'out' : 'in',
    amount,
    note: note || 'Cash entry',
  }
}

export default function CashFlowView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const y = cursor.getFullYear()
  const m0 = cursor.getMonth()
  const month = ym(cursor)
  const stepM = (n: number) => setCursor(new Date(y, m0 + n, 1))

  const [entryDate, setEntryDate] = useState(dateKey(new Date()))
  const [entryText, setEntryText] = useState('')

  const entries = useMemo(
    () => (data.cashEntries || []).filter((e) => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [data.cashEntries, month],
  )
  const totals = entries.reduce(
    (acc, e) => {
      if (e.kind === 'in') acc.inward += e.amount
      else acc.expense += e.amount
      acc.balance = acc.inward - acc.expense
      return acc
    },
    { inward: 0, expense: 0, balance: 0 },
  )

  const addEntry = () => {
    const parsed = parseEntry(entryText)
    if (!parsed) return
    store.addCashEntry(parsed.kind, parsed.amount, parsed.note, entryDate)
    setEntryText('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => stepM(-1)} className="nav-btn">‹</button>
        <div className="text-lg font-semibold">{MON[m0]} {y}</div>
        <button onClick={() => stepM(1)} className="nav-btn">›</button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Inward" value={inr(totals.inward)} tone="brand" />
        <Metric label="Expense" value={inr(totals.expense)} tone="absent" />
        <Metric label="Balance" value={inr(totals.balance)} tone={totals.balance < 0 ? 'absent' : 'fg'} />
      </div>

      <div className="rounded-xl border border-line bg-card2 p-3">
        <div className="mb-2 text-sm font-extrabold tracking-[0.12em] text-muted uppercase">Cash book</div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded-[10px] border border-line bg-card px-2 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEntry()}
            placeholder="50 sale / 150 tempo fare expense"
            className="min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
          <button onClick={addEntry} className="rounded-[10px] bg-brand px-4 text-sm font-extrabold text-ink active:brightness-95">
            Add
          </button>
        </div>
      </div>

      {/* Two-column cash book: inflow (paisa aaya) left, outflow (gaya) right */}
      <div className="grid grid-cols-2 gap-3">
        <Ledger title="Inflow" tone="in" entries={entries.filter((e) => e.kind === 'in')} total={totals.inward} />
        <Ledger title="Outflow" tone="out" entries={entries.filter((e) => e.kind === 'out')} total={totals.expense} />
      </div>
    </div>
  )
}

function Ledger({
  title,
  tone,
  entries,
  total,
}: {
  title: string
  tone: 'in' | 'out'
  entries: CashEntry[]
  total: number
}) {
  const isIn = tone === 'in'
  const accent = isIn ? 'text-brand' : 'text-absent'
  return (
    <div className="rounded-xl border border-line bg-card2 p-2.5">
      <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
        <span className={`text-[11px] font-extrabold uppercase tracking-[0.1em] ${accent}`}>
          {isIn ? '↓ ' : '↑ '}{title}
        </span>
        <span className={`text-sm font-black ${accent}`}>
          {isIn ? '+' : '−'} {inr(total)}
        </span>
      </div>
      <div className="space-y-1.5">
        {entries.length ? (
          entries.map((e) => (
            <div key={e.id} className="group rounded-lg border border-line bg-card p-2">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{e.note}</div>
                  <div className="text-[10px] text-muted">{fmtDay(e.date)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`text-sm font-black ${accent}`}>{inr(e.amount)}</span>
                  <button
                    onClick={() => store.removeCashEntry(e.id)}
                    className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-absent"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-line px-2 py-6 text-center text-[11px] text-muted">
            {isIn ? 'Koi inflow nahi' : 'Koi outflow nahi'}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'absent' | 'fg' }) {
  const color = tone === 'brand' ? 'text-brand' : tone === 'absent' ? 'text-absent' : 'text-fg'
  return (
    <div className="rounded-xl border border-line bg-card2 px-2 py-3">
      <div className="text-[11px] font-bold text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-black ${color}`}>{value}</div>
    </div>
  )
}
