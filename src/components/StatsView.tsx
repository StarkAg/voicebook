import { useState } from 'react'
import { store, useStore } from '../lib/store'
import { computeStats } from '../lib/pay'
import { MON, monthDays, isTue } from '../lib/date'

export default function StatsView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const [newName, setNewName] = useState('')
  const y = cursor.getFullYear()
  const m0 = cursor.getMonth()
  const stepM = (n: number) => setCursor(new Date(y, m0 + n, 1))

  const days = monthDays(cursor)
  const closed = days.filter(isTue).length
  const workingDays = days.length - closed
  const stats = computeStats(data, cursor)

  const addStaff = () => {
    const nm = newName.trim()
    if (!nm) return
    if (data.staff.includes(nm)) return
    store.addStaff(nm)
    setNewName('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => stepM(-1)} className="nav-btn">‹</button>
        <div className="text-lg font-semibold">{MON[m0]} {y}</div>
        <button onClick={() => stepM(1)} className="nav-btn">›</button>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        <span className="rounded-full border border-line bg-card2 px-3 py-1 text-fg">{workingDays} working days</span>
        <span className="rounded-full border border-line bg-card2 px-3 py-1 text-muted">{closed} closed</span>
      </div>

      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.name} className="rounded-xl border border-line bg-card2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">{s.name}</span>
              <span className={`text-sm font-extrabold ${s.pct >= 90 ? 'text-brand' : s.pct >= 75 ? 'text-half' : 'text-absent'}`}>
                {s.pct}%
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/15">
              <span className="bg-brand" style={{ flexGrow: s.p }} />
              <span className="bg-half" style={{ flexGrow: s.h }} />
              <span className="bg-absent" style={{ flexGrow: s.n }} />
              {s.counted === 0 && <span className="flex-1 bg-card" />}
            </div>
            <div className="mt-1.5 flex gap-3 text-[11px] text-muted">
              <span className="text-brand">{s.p} present</span>
              {s.h > 0 && <span className="text-half">{s.h} half</span>}
              <span className="text-absent">{s.n} absent</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-card2 p-3">
        <div className="mb-2 text-sm font-extrabold tracking-[0.12em] text-muted uppercase">Manage staff</div>
        <div className="mb-3 space-y-2">
          {data.staff.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-[10px] border border-line bg-card px-3 py-2 text-sm font-semibold">
              <span>{name}</span>
              <button
                onClick={() => store.removeStaff(name)}
                className="grid h-7 w-7 place-items-center rounded-full text-base leading-none text-muted transition hover:bg-absent/10 hover:text-absent"
                aria-label={`Remove ${name}`}
                title={`Remove ${name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStaff()}
            placeholder="New worker name"
            className="min-w-0 flex-1 rounded-[10px] border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
          <button onClick={addStaff} className="rounded-[10px] bg-brand px-4 py-2 text-sm font-extrabold text-ink active:brightness-95">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
