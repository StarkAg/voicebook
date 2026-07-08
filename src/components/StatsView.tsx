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

      <div className="flex justify-center gap-2 text-xs">
        <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">{workingDays} working days</span>
        <span className="rounded-full bg-slate-500/15 px-3 py-1 text-slate-400">{closed} closed</span>
      </div>

      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.name} className="rounded-xl bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{s.name}</span>
              <span className={`text-sm font-semibold ${s.pct >= 90 ? 'text-emerald-400' : s.pct >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                {s.pct}%
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
              <span className="bg-emerald-500" style={{ flexGrow: s.p }} />
              <span className="bg-amber-500" style={{ flexGrow: s.h }} />
              <span className="bg-rose-500" style={{ flexGrow: s.n }} />
              {s.counted === 0 && <span className="flex-1 bg-white/5" />}
            </div>
            <div className="mt-1.5 flex gap-3 text-[11px] text-slate-400">
              <span>{s.p} present</span>
              {s.h > 0 && <span>{s.h} half</span>}
              <span>{s.n} absent</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white/5 p-3">
        <div className="mb-2 text-sm font-medium text-slate-300">Manage staff</div>
        <div className="mb-2 flex flex-wrap gap-2">
          {data.staff.map((name) => (
            <span key={name} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3 pr-2 text-sm">
              {name}
              <button onClick={() => store.removeStaff(name)} className="text-slate-400 hover:text-rose-400">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStaff()}
            placeholder="New worker name"
            className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-slate-500"
          />
          <button onClick={addStaff} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
