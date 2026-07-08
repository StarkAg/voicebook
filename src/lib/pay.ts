import type { AppData, Status } from './types'
import { dateKey, isTue, monthDays, ym } from './date'

export const ATTEND_THRESHOLD = 20 // min attended days to unlock Tuesday pay

export function statusFor(data: AppData, d: Date, name: string): Status | '' {
  const rec = data.days[dateKey(d)]?.marks?.[name]
  if (rec) return rec
  if (isTue(d)) return 'C'
  return ''
}

export interface PayRow {
  name: string
  rate: number
  attended: number
  paidDays: number
  unlocked: boolean
  base: number
  tueBonus: number
  advTotal: number
  net: number
}

export function computePay(data: AppData, cursor: Date, name: string): PayRow {
  const days = monthDays(cursor)
  const rate = Number(data.rates[name] || 0)
  const tuesdays = days.filter(isTue).length
  const month = ym(cursor)

  let attended = 0
  let paidDays = 0
  for (const d of days) {
    const st = statusFor(data, d, name)
    const w = st === 'P' ? 1 : st === 'H' ? 0.5 : 0
    if (!w) continue
    attended += w
    if (!isTue(d)) paidDays += w
  }

  const unlocked = attended >= ATTEND_THRESHOLD
  const base = paidDays * rate
  const tueBonus = unlocked ? tuesdays * rate : 0
  const advTotal = data.advances
    .filter((a) => a.staff === name && a.date.startsWith(month))
    .reduce((s, a) => s + Number(a.amount || 0), 0)
  const net = base + tueBonus - advTotal

  return { name, rate, attended, paidDays, unlocked, base, tueBonus, advTotal, net }
}

export interface StatRow {
  name: string
  p: number
  n: number
  h: number
  counted: number
  pct: number
}

export function computeStats(data: AppData, cursor: Date): StatRow[] {
  const days = monthDays(cursor)
  return data.staff.map((name) => {
    let p = 0,
      n = 0,
      h = 0
    for (const d of days) {
      const st = statusFor(data, d, name)
      if (st === 'P') p++
      else if (st === 'N') n++
      else if (st === 'H') h++
    }
    const counted = p + n + h
    const pct = counted ? Math.round(((p + 0.5 * h) / counted) * 100) : 0
    return { name, p, n, h, counted, pct }
  })
}
