export type Status = 'P' | 'N' | 'H' | 'C'

export const STATUS_LABEL: Record<Status, string> = {
  P: 'Present',
  N: 'Absent',
  H: 'Half day',
  C: 'Closed',
}

export interface DayRecord {
  date: string // YYYY-MM-DD
  marks: Record<string, Status> // staff name -> status
  locked: boolean
}

export interface Advance {
  id: string
  staff: string
  date: string // YYYY-MM-DD
  amount: number
  note?: string
}

export interface CashEntry {
  id: string
  date: string // YYYY-MM-DD
  kind: 'in' | 'out'
  amount: number
  note: string
  source?: 'manual' | 'voice'
}

export interface LogEntry {
  at: number
  summary: string
  date?: string
  source?: 'manual' | 'voice'
}

export interface AppData {
  staff: string[]
  rates: Record<string, number> // staff -> daily rate
  days: Record<string, DayRecord> // date -> record
  advances: Advance[]
  cashEntries: CashEntry[]
  log: LogEntry[]
}

// --- Customer billing ---

export interface BillItem {
  name: string
  qty: number
  unitPrice: number
  amount: number
}

export interface Bill {
  id: string
  customerName: string
  customerPhone: string
  items: BillItem[]
  total: number
  status: 'draft' | 'sent'
  createdAt: number
}

export interface Customer {
  name: string
  phone: string
}

export interface PaymentRequest {
  id: string
  customerName: string
  customerPhone: string
  amount: number
  vpa: string
  upiLink: string
  note: string
  status: 'pending' | 'sent'
  createdAt: number
}
