import { useState } from 'react'
import DailyView from './components/DailyView'
import MonthView from './components/MonthView'
import StatsView from './components/StatsView'
import PayView from './components/PayView'
import VoiceDock from './components/VoiceDock'

type Tab = 'day' | 'month' | 'stats' | 'pay'

const TABS: { key: Tab; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'month', label: 'Month' },
  { key: 'stats', label: 'Stats' },
  { key: 'pay', label: 'Pay' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('day')
  const [cursor, setCursor] = useState(new Date())

  return (
    <div className="mx-auto min-h-full max-w-md bg-[#0b1020] pb-40 text-slate-100">
      <header className="flex items-center gap-3 px-4 pt-5 pb-3">
        <img src="/logo.png" alt="VoiceBook" className="h-10 w-10 rounded-xl" />
        <div>
          <div className="text-lg font-bold leading-tight">VoiceBook</div>
          <div className="text-xs text-slate-400">Speak. Attendance & wages, done.</div>
        </div>
        <span className="ml-auto rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">
          Powered by Mesh
        </span>
      </header>

      <nav className="sticky top-0 z-10 flex gap-1 border-b border-white/10 bg-[#0b1020]/90 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4">
        {tab === 'day' && <DailyView cursor={cursor} setCursor={setCursor} />}
        {tab === 'month' && <MonthView cursor={cursor} setCursor={setCursor} />}
        {tab === 'stats' && <StatsView cursor={cursor} setCursor={setCursor} />}
        {tab === 'pay' && <PayView cursor={cursor} setCursor={setCursor} />}
      </main>

      <VoiceDock cursor={cursor} />
    </div>
  )
}
