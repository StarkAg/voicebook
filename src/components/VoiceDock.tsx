import { useState } from 'react'
import { useRecorder } from '../lib/useRecorder'
import { transcribe, speak, meshConfigured, MeshError } from '../lib/mesh'
import { runVoiceCommand, type Action } from '../lib/agent'
import { store } from '../lib/store'
import { dateKey } from '../lib/date'
import type { Status } from '../lib/types'

type Phase = 'idle' | 'recording' | 'thinking' | 'done' | 'error'

function applyActions(actions: Action[]): number {
  let n = 0
  for (const a of actions) {
    switch (a.type) {
      case 'mark':
        store.setMark(a.date || dateKey(new Date()), a.staff, a.status as Status, 'voice')
        n++
        break
      case 'advance':
        store.addAdvance(a.staff, a.amount, a.note, a.date, 'voice')
        n++
        break
      case 'set_rate':
        store.setRate(a.staff, a.rate)
        n++
        break
      case 'add_staff':
        store.addStaff(a.name)
        n++
        break
      case 'remove_staff':
        store.removeStaff(a.name)
        n++
        break
    }
  }
  return n
}

export default function VoiceDock({ cursor }: { cursor: Date }) {
  const rec = useRecorder()
  const [phase, setPhase] = useState<Phase>('idle')
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [typed, setTyped] = useState('')

  const handleTranscript = async (text: string) => {
    if (!text.trim()) {
      setPhase('idle')
      return
    }
    setTranscript(text)
    setPhase('thinking')
    try {
      const result = await runVoiceCommand(text, store.get(), cursor)
      const count = applyActions(result.actions)
      const reply = result.answer || (count ? 'Ho gaya.' : '')
      setAnswer(reply)
      store.logVoice(`🎙️ "${text}"${reply ? ` → ${reply}` : ''}`)
      setPhase('done')
      if (reply) {
        try {
          const url = await speak(reply)
          new Audio(url).play().catch(() => {})
        } catch {
          // TTS is best-effort
        }
      }
    } catch (e) {
      setAnswer(e instanceof MeshError ? e.message : 'Kuch gadbad ho gayi. Dobara try karein.')
      setPhase('error')
    }
  }

  const onMicClick = async () => {
    if (phase === 'thinking') return
    if (rec.recording) {
      const blob = await rec.stop()
      if (!blob) {
        setPhase('idle')
        return
      }
      setPhase('thinking')
      try {
        const text = await transcribe(blob)
        await handleTranscript(text)
      } catch (e) {
        setAnswer(e instanceof MeshError ? e.message : 'Awaaz samajh nahi aayi.')
        setPhase('error')
      }
    } else {
      setTranscript('')
      setAnswer('')
      await rec.start()
      setPhase('recording')
    }
  }

  const submitTyped = async () => {
    const t = typed.trim()
    if (!t) return
    setTyped('')
    await handleTranscript(t)
  }

  const configured = meshConfigured()

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-500/15 bg-black/95 backdrop-blur">
      <div className="mx-auto max-w-md px-4 py-3">
        {(transcript || answer) && (
          <div className="mb-3 space-y-1.5 text-sm">
            {transcript && (
              <div className="text-slate-400">
                <span className="text-slate-500">You:</span> {transcript}
              </div>
            )}
            {answer && (
              <div className={phase === 'error' ? 'text-rose-400' : 'text-brand-400'}>
                <span className="text-stone-500">VoiceBook:</span> {answer}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onMicClick}
            disabled={!configured || phase === 'thinking'}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
              rec.recording ? 'animate-pulse bg-rose-500 text-white' : 'bg-brand-500 text-black hover:bg-brand-400'
            }`}
            title={configured ? 'Hold a thought, tap to speak' : 'Add VITE_MESH_API_KEY to enable voice'}
          >
            {phase === 'thinking' ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <MicIcon />
            )}
          </button>

          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            placeholder={rec.recording ? 'Listening…' : 'or type: "Ramesh present, Suresh ko 500 advance"'}
            disabled={rec.recording}
            className="flex-1 rounded-full bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
          />
        </div>

        {!configured && (
          <div className="mt-2 text-center text-xs text-amber-400">
            Voice needs a Mesh key — copy .env.example to .env.local and add VITE_MESH_API_KEY.
          </div>
        )}
        {rec.error && <div className="mt-2 text-center text-xs text-rose-400">{rec.error}</div>}
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  )
}
