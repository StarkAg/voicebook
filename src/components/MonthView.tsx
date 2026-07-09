import { store, useStore } from '../lib/store'
import { statusFor } from '../lib/pay'
import { MON, WD, dateKey, monthDays, isTue } from '../lib/date'
import type { Status } from '../lib/types'

const CELL: Record<Status, string> = {
  P: 'bg-emerald-500 text-white',
  N: 'bg-rose-500 text-white',
  H: 'bg-amber-500 text-white',
  C: 'bg-slate-600 text-slate-300',
}

const ORDER: (Status | '')[] = ['P', 'N', 'H', 'C', '']

export default function MonthView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const y = cursor.getFullYear()
  const m0 = cursor.getMonth()
  const days = monthDays(cursor)
  const todayKey = dateKey(new Date())
  const stepM = (n: number) => setCursor(new Date(y, m0 + n, 1))

  const cycle = (d: Date, name: string) => {
    const cur = data.days[dateKey(d)]?.marks?.[name] || (isTue(d) ? 'C' : '')
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    store.setMark(dateKey(d), name, next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => stepM(-1)} className="nav-btn">‹</button>
        <div className="text-lg font-semibold">{MON[m0]} {y}</div>
        <button onClick={() => stepM(1)} className="nav-btn">›</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-black text-left text-stone-400">Staff</th>
              {days.map((d) => (
                <th key={d.getDate()} className={`min-w-7 font-normal ${isTue(d) ? 'text-amber-400' : d.getDay() === 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  <div>{d.getDate()}</div>
                  <div className="text-[9px]">{WD[d.getDay()][0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.staff.map((name) => (
              <tr key={name}>
                <td className="sticky left-0 z-10 bg-black whitespace-nowrap pr-2 text-left font-medium">{name}</td>
                {days.map((d) => {
                  const st = statusFor(data, d, name)
                  const future = dateKey(d) > todayKey
                  return (
                    <td key={d.getDate()}>
                      <button
                        disabled={future}
                        onClick={() => cycle(d, name)}
                        className={`h-7 w-7 rounded-md text-[11px] font-semibold disabled:opacity-20 ${st ? CELL[st] : 'bg-white/5 text-slate-500'}`}
                      >
                        {future ? '' : st === 'H' ? '½' : st}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-400">P present</span>
        <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-400">N absent</span>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400">½ half</span>
        <span className="rounded-full bg-slate-500/15 px-2.5 py-1">C closed</span>
      </div>
    </div>
  )
}
