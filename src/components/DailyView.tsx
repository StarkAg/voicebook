import { store, useStore } from '../lib/store'
import { statusFor } from '../lib/pay'
import { WD, MON, dateKey } from '../lib/date'
import MonthView from './MonthView'
import StatsView from './StatsView'
import type { Status } from '../lib/types'

const SEG: { key: Status; label: string; cls: string }[] = [
  { key: 'P', label: 'P', cls: 'data-[on=true]:border-brand data-[on=true]:bg-brand data-[on=true]:text-ink' },
  { key: 'H', label: '1/2', cls: 'data-[on=true]:border-half data-[on=true]:bg-half data-[on=true]:text-white' },
  { key: 'N', label: 'N', cls: 'data-[on=true]:border-absent data-[on=true]:bg-absent data-[on=true]:text-white' },
]

export default function DailyView({ cursor, setCursor }: { cursor: Date; setCursor: (d: Date) => void }) {
  const data = useStore()
  const todayKey = dateKey(new Date())
  const currentKey = dateKey(cursor)
  const isToday = dateKey(cursor) === todayKey
  const isTuesday = cursor.getDay() === 2
  const saved = data.days[currentKey]?.locked === true

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

  const saveDay = () => {
    store.setDayAll(currentKey, Object.fromEntries(data.staff.map((s) => [s, statusFor(data, cursor, s) || 'P'])))
    store.lockDay(currentKey)
  }

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
            className="text-xs text-muted underline disabled:text-brand disabled:no-underline"
          >
            {isToday ? 'Today' : 'Go to today'}
          </button>
        </div>
        <button onClick={() => step(1)} disabled={isToday} className="nav-btn disabled:opacity-30">›</button>
      </div>

      {isTuesday && (
        <div className="rounded-[10px] border border-half/30 bg-half/10 px-3 py-2 text-center text-xs text-half">
          Tuesday — shop usually closed. Mark only if it was open.
        </div>
      )}

      <div className="space-y-2">
        {data.staff.map((name) => {
          const st = statusFor(data, cursor, name)
          return (
            <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card2 p-2">
              <span className="font-bold">{name}</span>
              <div className="flex gap-1.5">
                {SEG.map((s) => (
                  <button
                    key={s.key}
                    data-on={st === s.key}
                    onClick={() => store.setMark(dateKey(cursor), name, st === s.key ? '' : s.key)}
                    className={`h-11 w-11 rounded-[10px] border border-line bg-card text-sm font-extrabold text-muted transition active:brightness-95 ${s.cls}`}
                  >
                    {s.label}
                  </button>
                ))}
                {st === 'C' && <span className="self-center px-2 text-xs text-muted">Closed</span>}
              </div>
            </div>
          )
        })}
      </div>

      {saved && (
        <div className="rounded-[10px] border border-line bg-card2 px-3 py-2 text-center text-xs font-bold text-muted">
          Saved
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => store.setDayAll(currentKey, Object.fromEntries(data.staff.map((s) => [s, 'P'])))}
            className="rounded-xl bg-brand px-2 py-3 text-sm font-extrabold text-ink active:brightness-95"
          >
            All present
          </button>
          <button
            onClick={() => store.setDayAll(currentKey, Object.fromEntries(data.staff.map((s) => [s, 'C'])))}
            className="rounded-xl border border-line bg-card2 px-2 py-3 text-sm font-bold text-fg active:brightness-95"
          >
            Shop closed
          </button>
        </div>

        <button
          onClick={saveDay}
          className="w-full rounded-xl border border-brand bg-card px-2 py-3 text-sm font-extrabold text-brand active:brightness-95"
        >
          Save
        </button>
      </div>

      <div className="daily-section-divider" />

      <MonthView cursor={cursor} setCursor={setCursor} />

      <div className="flex justify-center gap-2 text-xs">
        {counts.n > 0 && <span className="rounded-full border border-line bg-card2 px-3 py-1 text-absent">{counts.n} absent</span>}
        {counts.h > 0 && <span className="rounded-full border border-line bg-card2 px-3 py-1 text-half">{counts.h} half</span>}
      </div>

      <StatsView cursor={cursor} setCursor={setCursor} />
    </div>
  )
}
