import { useSyncExternalStore } from 'react'
import type { AppData, Advance, Status, LogEntry } from './types'
import { dateKey } from './date'

const KEY = 'voicebook:data'

const SEED: AppData = {
  staff: ['Ramesh', 'Suresh', 'Mahesh'],
  rates: { Ramesh: 600, Suresh: 550, Mahesh: 500 },
  days: {},
  advances: [],
  log: [],
}

function load(): AppData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (raw && Array.isArray(raw.staff)) return { ...SEED, ...raw }
  } catch {
    // ignore
  }
  return structuredClone(SEED)
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

function set(next: AppData) {
  state = next
  emit()
}

function log(entry: Omit<LogEntry, 'at'>) {
  state = { ...state, log: [{ at: Date.now(), ...entry }, ...state.log].slice(0, 300) }
}

export const store = {
  get: () => state,
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  setMark(date: string, staff: string, status: Status | '', source: 'manual' | 'voice' = 'manual') {
    const days = { ...state.days }
    const day = days[date]
      ? { ...days[date], marks: { ...days[date].marks } }
      : { date, marks: {}, locked: false }
    const prev = day.marks[staff]
    if (status) day.marks[staff] = status
    else delete day.marks[staff]
    days[date] = day
    log({ summary: `${staff}: ${prev || '—'} → ${status || '—'}`, date, source })
    set({ ...state, days })
  },

  setDayAll(date: string, marks: Record<string, Status>, source: 'manual' | 'voice' = 'manual') {
    const days = { ...state.days }
    days[date] = { date, marks: { ...marks }, locked: days[date]?.locked ?? false }
    log({ summary: `Set whole day (${Object.keys(marks).length} staff)`, date, source })
    set({ ...state, days })
  },

  lockDay(date: string) {
    const days = { ...state.days }
    if (days[date]) days[date] = { ...days[date], locked: true }
    set({ ...state, days })
  },

  setRate(staff: string, rate: number) {
    set({ ...state, rates: { ...state.rates, [staff]: rate } })
  },

  addStaff(name: string) {
    if (state.staff.includes(name)) return
    log({ summary: `Added worker ${name}` })
    set({ ...state, staff: [...state.staff, name] })
  },

  removeStaff(name: string) {
    log({ summary: `Removed worker ${name}` })
    set({ ...state, staff: state.staff.filter((s) => s !== name) })
  },

  addAdvance(staff: string, amount: number, note = '', date?: string, source: 'manual' | 'voice' = 'manual') {
    const adv: Advance = {
      id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      staff,
      date: date || dateKey(new Date()),
      amount,
      note,
    }
    log({ summary: `Advance ₹${amount} to ${staff}${note ? ` (${note})` : ''}`, date: adv.date, source })
    set({ ...state, advances: [...state.advances, adv] })
  },

  removeAdvance(id: string) {
    set({ ...state, advances: state.advances.filter((a) => a.id !== id) })
  },

  logVoice(summary: string) {
    log({ summary, source: 'voice' })
    set({ ...state })
  },
}

export function useStore(): AppData {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
