export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const pad = (n: number) => String(n).padStart(2, '0')
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const isTue = (d: Date) => d.getDay() === 2
export const daysInMonth = (y: number, m1: number) => new Date(y, m1, 0).getDate()

export const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export function monthDays(cursor: Date): Date[] {
  const y = cursor.getFullYear()
  const m0 = cursor.getMonth()
  const dim = daysInMonth(y, m0 + 1)
  return Array.from({ length: dim }, (_, i) => new Date(y, m0, i + 1))
}

export function fmtDay(dateStr: string): string {
  const [, m, dd] = dateStr.split('-').map(Number)
  return `${dd} ${MON[m - 1]}`
}

export function fmtWhen(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MON[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
