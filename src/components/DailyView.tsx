import { store, useStore } from '../lib/store'
import { statusFor } from '../lib/pay'
import { WD, MON, dateKey } from '../lib/date'
import type { Status } from '../lib/types'

const SEG: { key: Status; label: string; cls: string }[] = [
  { key: 'P', label: 'P', cls: 'data-[on=true]:bg-emerald-500 data-[on=true]:text-white' },
  { key: 'H', label: '½', cls: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white' },
  { key: 'N', label: 'N', cls: 'data-[on=true]:bg-rose-500 data-[on=true]:text-white' },
]

export default function DailyView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const todayKey = dateKey(new Date())
  const isToday = dateKey(cursor) === todayKey
  const isTuesday = cursor.getDay() === 2

  const step = (n: number) => {
    const d = new Date(cursor)
    d.setDate(d.getDate() + n)
    if (dateKey(d) > todayKey) return
    setCursor(d)
  }

  const counts = data.staff.reduce(
    (acc, name) => {
      const s = statusFor(data, cursor, name)
      if (s === 'P') acc.p++
      else if (s === 'N') acc.n++
      else if (s === 'H') acc.h++
      return acc
    },
    { p: 0, n: 0, h: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => step(-1)} className="nav-btn">‹</button>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {WD[cursor.getDay()]}, {cursor.getDate()} {MON[cursor.getMonth()]}
          </div>
          <button
            onClick={() => setCursor(new Date())}
            disabled={isToday}
            className="text-xs text-brand-500 disabled:text-slate-400"
          >
            {isToday ? 'Today' : 'Go to today'}
          </button>
        </div>
        <button onClick={() => step(1)} disabled={isToday} className="nav-btn disabled:opacity-30">›</button>
      </div>

      {isTuesday && (
        <div className="rounded-lg bg-slate-500/10 px-3 py-2 text-center text-xs text-slate-400">
          Tuesday — shop usually closed. Mark only if it was open.
        </div>
      )}

      <div className="space-y-2">
        {data.staff.map((name) => {
          const st = statusFor(data, cursor, name)
          return (
            <div key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="font-medium">{name}</span>
              <div className="flex gap-1.5">
                {SEG.map((s) => (
                  <button
                    key={s.key}
                    data-on={st === s.key}
                    onClick={() => store.setMark(dateKey(cursor), name, st === s.key ? '' : s.key)}
                    className={`h-9 w-9 rounded-lg bg-white/10 text-sm font-semibold text-slate-300 transition ${s.cls}`}
                  >
                    {s.label}
                  </button>
                ))}
                {st === 'C' && <span className="self-center px-2 text-xs text-slate-400">Closed</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => store.setDayAll(dateKey(cursor), Object.fromEntries(data.staff.map((s) => [s, 'P'])))}
          className="flex-1 rounded-lg bg-emerald-500/15 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/25"
        >
          All present
        </button>
        <button
          onClick={() => store.setDayAll(dateKey(cursor), Object.fromEntries(data.staff.map((s) => [s, 'C'])))}
          className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-medium text-slate-300 hover:bg-white/15"
        >
          Shop closed
        </button>
      </div>

      <div className="flex justify-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-400">{counts.p} present</span>
        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-rose-400">{counts.n} absent</span>
        {counts.h > 0 && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-400">{counts.h} half</span>}
      </div>
    </div>
  )
}
