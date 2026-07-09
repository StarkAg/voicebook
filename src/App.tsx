import { useState } from 'react'
import DailyView from './components/DailyView'
import PayView from './components/PayView'
import CashFlowView from './components/CashFlowView'
import BillingView from './components/BillingView'
import VoiceDock from './components/VoiceDock'

type Tab = 'day' | 'pay' | 'cashflow' | 'billing'

const TABS: { key: Tab; label: string }[] = [
  { key: 'day', label: 'Attendance' },
  { key: 'pay', label: 'Pay' },
  { key: 'cashflow', label: 'CashFlow' },
  { key: 'billing', label: 'Billing' },
]

const today = () => new Date()

export default function App() {
  const [tab, setTab] = useState<Tab>('day')
  const [cursor, setCursor] = useState(today)

  return (
    <div className="mx-auto min-h-full max-w-[760px] bg-bg px-3 pt-16 pb-40 text-fg">
      <header className="fixed inset-x-0 top-0 z-20 mx-auto max-w-[760px] border-b border-line bg-bg/95 px-3 py-3 backdrop-blur">
        <div className="text-lg font-bold leading-tight">
          Voice<span className="text-brand">Book</span>
        </div>
        <div className="text-[10px] font-semibold text-muted">
          Powered by Mesh API
        </div>
      </header>

      <nav className="mb-4 grid grid-cols-4 gap-2 bg-bg/95 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              if (t.key === 'day') setCursor(today())
            }}
            className={`min-w-0 rounded-xl border px-1 py-2.5 text-xs font-bold transition sm:text-sm ${
              tab === t.key ? 'border-brand bg-brand text-ink' : 'border-line bg-card text-muted hover:bg-card2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="rounded-[18px] border border-line bg-card p-3 shadow-sm">
        {tab === 'day' && <DailyView cursor={cursor} setCursor={setCursor} />}
        {tab === 'pay' && <PayView cursor={cursor} setCursor={setCursor} />}
        {tab === 'cashflow' && <CashFlowView cursor={cursor} setCursor={setCursor} />}
        {tab === 'billing' && <BillingView />}
      </main>

      <VoiceDock cursor={cursor} />
    </div>
  )
}
