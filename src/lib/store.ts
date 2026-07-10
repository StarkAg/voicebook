import { useSyncExternalStore } from 'react'
import type { AppData, Status, CashEntry } from './types'
import { dateKey } from './date'
import { client } from './convexClient'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { getToken, subscribeAuth } from './auth'

// Convex-backed, per-user store. The API surface matches the old local-first
// store so DailyView/PayView/CashFlowView/VoiceDock are unchanged. A single
// live subscription to data.getAll (scoped by the session token) feeds the tree;
// mutators are fire-and-forget and flow back through that subscription.
const EMPTY: AppData = { staff: [], rates: {}, days: {}, advances: [], cashEntries: [], log: [] }

let state: AppData = EMPTY
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

let unsub: (() => void) | null = null
function resubscribe() {
  unsub?.()
  const token = getToken() ?? undefined
  unsub = client.onUpdate(api.data.getAll, { token }, (data) => {
    state = data as AppData
    emit()
  })
}
resubscribe()
// Re-scope the subscription whenever the signed-in user changes.
subscribeAuth(() => {
  state = EMPTY
  emit()
  resubscribe()
})

const tok = () => getToken() ?? ''

export const store = {
  get: () => state,
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  setMark: (date: string, staff: string, status: Status | '', source: 'manual' | 'voice' = 'manual') =>
    void client.mutation(api.days.setMark, { token: tok(), date, staff, status: status || null, source }),

  setDayAll: (date: string, marks: Record<string, Status>, source: 'manual' | 'voice' = 'manual') =>
    void client.mutation(api.days.setDayAll, { token: tok(), date, marks, source }),

  lockDay: (date: string) => void client.mutation(api.days.lockDay, { token: tok(), date }),

  setRate: (staff: string, rate: number) =>
    void client.mutation(api.staff.setRate, { token: tok(), staff, rate }),

  addStaff: (name: string) => void client.mutation(api.staff.add, { token: tok(), name }),

  removeStaff: (name: string) => void client.mutation(api.staff.remove, { token: tok(), name }),

  addAdvance: (
    staff: string,
    amount: number,
    note = '',
    date?: string,
    source: 'manual' | 'voice' = 'manual',
  ) =>
    void client.mutation(api.advances.add, {
      token: tok(),
      staff,
      amount,
      note,
      date: date ?? dateKey(new Date()),
      source,
    }),

  removeAdvance: (id: string) =>
    void client.mutation(api.advances.remove, { token: tok(), id: id as Id<'advances'> }),

  addCashEntry: (
    kind: CashEntry['kind'],
    amount: number,
    note: string,
    date?: string,
    source: 'manual' | 'voice' = 'manual',
  ) =>
    void client.mutation(api.cash.add, {
      token: tok(),
      kind,
      amount,
      note,
      date: date ?? dateKey(new Date()),
      source,
    }),

  removeCashEntry: (id: string) =>
    void client.mutation(api.cash.remove, { token: tok(), id: id as Id<'cashEntries'> }),

  logVoice: (summary: string) =>
    void client.mutation(api.logs.append, { token: tok(), summary, source: 'voice' }),
}

export function useStore(): AppData {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
