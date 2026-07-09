import { store, useStore } from '../lib/store'
import { statusFor } from '../lib/pay'
import { MON, WD, dateKey, monthDays, isTue } from '../lib/date'
import type { Status } from '../lib/types'

const CELL: Record<Status, string> = {
  P: 'bg-brand text-ink',
  N: 'bg-absent text-white',
  H: 'bg-half text-white',
  C: 'bg-muted/15 text-muted',
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

      <div className="month-scroll">
        <table className="w-full border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card text-left text-muted">Staff</th>
              {days.map((d) => (
                <th key={d.getDate()} className={`min-w-7 font-normal ${isTue(d) ? 'text-half' : d.getDay() === 0 ? 'text-absent' : 'text-muted'}`}>
                  <div>{d.getDate()}</div>
                  <div className="text-[9px]">{WD[d.getDay()][0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.staff.map((name) => (
              <tr key={name}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-card pr-2 text-left font-bold">{name}</td>
                {days.map((d) => {
                  const st = statusFor(data, d, name)
                  const future = dateKey(d) > todayKey
                  return (
                    <td key={d.getDate()}>
                      <button
                        disabled={future}
                        onClick={() => cycle(d, name)}
                        className={`h-8 w-8 rounded-md border border-line text-[11px] font-extrabold disabled:opacity-20 ${st ? CELL[st] : 'bg-card2 text-muted'}`}
                      >
                        {future ? '' : st === 'H' ? '1/2' : st}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-xs text-muted">
        <span className="rounded-full border border-line bg-card2 px-2.5 py-1 text-brand">P present</span>
        <span className="rounded-full border border-line bg-card2 px-2.5 py-1 text-absent">N absent</span>
        <span className="rounded-full border border-line bg-card2 px-2.5 py-1 text-half">1/2 half</span>
        <span className="rounded-full border border-line bg-card2 px-2.5 py-1">C closed</span>
      </div>
    </div>
  )
}
