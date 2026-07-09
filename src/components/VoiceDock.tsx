import { useState } from 'react'
import { useRecorder } from '../lib/useRecorder'
import { transcribe, meshConfigured, MeshError } from '../lib/mesh'
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
      case 'cash':
        store.addCashEntry(a.kind, a.amount, a.note || '', a.date, 'voice')
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
      // Fast path: actions apply silently with a compact local confirmation —
      // no spoken reply, no AI-written sentence (saves tokens). Only pure
      // questions (no actions) get a text answer from the model.
      const reply = count ? `✓ ${count} ${count === 1 ? 'update' : 'updates'}` : result.answer
      setAnswer(reply)
      store.logVoice(`🎙️ "${text}"${reply ? ` → ${reply}` : ''}`)
      setPhase('done')
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto max-w-[760px] px-4 py-3">
        {(transcript || answer) && (
          <div className="mb-3 space-y-1.5 rounded-xl border border-line bg-card p-3 text-sm shadow-sm">
            {transcript && (
              <div className="text-fg">
                <span className="font-bold text-muted">You:</span> {transcript}
              </div>
            )}
            {answer && (
              <div className={phase === 'error' ? 'text-absent' : 'text-brand'}>
                <span className="font-bold text-muted">VoiceBook:</span> {answer}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onMicClick}
            disabled={!configured || phase === 'thinking'}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition disabled:opacity-40 ${
              rec.recording ? 'animate-pulse bg-absent text-white' : 'bg-brand text-ink active:brightness-95'
            }`}
            title={configured ? 'Hold a thought, tap to speak' : 'Add VITE_MESH_API_KEY to enable voice'}
          >
            {phase === 'thinking' ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
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
            className="min-w-0 flex-1 rounded-full border border-line bg-card2 px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
        </div>

        {!configured && (
          <div className="mt-2 rounded-[10px] border border-half/30 bg-half/10 px-3 py-2 text-center text-xs text-half">
            Voice needs a Mesh key — copy .env.example to .env.local and add VITE_MESH_API_KEY.
          </div>
        )}
        {rec.error && <div className="mt-2 text-center text-xs text-absent">{rec.error}</div>}
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
