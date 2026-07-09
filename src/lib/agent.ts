import type { AppData, Status } from './types'
import { chat } from './mesh'
import { computePay, computeStats, statusFor } from './pay'
import { dateKey, ym } from './date'

export type Action =
  | { type: 'mark'; staff: string; status: Status; date: string }
  | { type: 'advance'; staff: string; amount: number; note?: string; date: string }
  | { type: 'cash'; kind: 'in' | 'out'; amount: number; note?: string; date: string }
  | { type: 'set_rate'; staff: string; rate: number }
  | { type: 'add_staff'; name: string }
  | { type: 'remove_staff'; name: string }

export interface AgentResult {
  actions: Action[]
  answer: string
}

function parseSimpleCashCommand(transcript: string, cursor: Date): AgentResult | null {
  const text = transcript.trim().toLowerCase()
  const match = text.match(/^(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s+(sale|sales|expense|expenses|out|in|income|received|receipt)\b(?:\s+(.*))?$/i)
  if (!match) return null

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const kindWord = match[2]
  const note = (match[3] || kindWord).trim()
  const kind: 'in' | 'out' = /expense|expenses|out/i.test(kindWord) ? 'out' : 'in'

  return {
    actions: [
      {
        type: 'cash',
        kind,
        amount,
        note: note || (kind === 'in' ? 'sale' : 'expense'),
        date: dateKey(cursor),
      },
    ],
    answer: kind === 'in' ? `₹${amount} sale add kar diya.` : `₹${amount} expense add kar diya.`,
  }
}

// Compact snapshot so the model can answer questions and resolve names/dates.
function buildContext(data: AppData, cursor: Date): string {
  const today = dateKey(new Date())
  const month = ym(cursor)
  const todayMarks = data.days[today]?.marks || {}
  const cashEntries = (data.cashEntries || []).filter((e) => e.date.startsWith(month))
  const cashIn = cashEntries.filter((e) => e.kind === 'in').reduce((s, e) => s + Number(e.amount || 0), 0)
  const cashOut = cashEntries.filter((e) => e.kind === 'out').reduce((s, e) => s + Number(e.amount || 0), 0)

  const stats = computeStats(data, cursor)
  const lines = data.staff.map((name) => {
    const pay = computePay(data, cursor, name)
    const st = stats.find((s) => s.name === name)!
    const todaySt = statusFor(data, new Date(), name) || '—'
    return `- ${name}: rate ₹${pay.rate}/day, today=${todaySt}, month(${month}) present=${st.p} half=${st.h} absent=${st.n}, earnings=₹${pay.net}, advances=₹${pay.advTotal}`
  })

  return [
    `TODAY: ${today}`,
    `CURRENT_MONTH: ${month}`,
    `STAFF: ${data.staff.join(', ') || '(none)'}`,
    `TODAY_MARKS: ${JSON.stringify(todayMarks)}`,
    `CASH_BOOK(${month}): inward=₹${cashIn}, expense=₹${cashOut}, balance=₹${cashIn - cashOut}`,
    `SUMMARY:`,
    ...lines,
  ].join('\n')
}

const SYSTEM = `You are VoiceBook, a voice assistant for an Indian shop owner tracking staff attendance and daily wages. The owner speaks in Hindi, Hinglish, or English.

Convert the owner's spoken instruction into structured actions and a short spoken reply.

Status codes: P=present, H=half day, N=absent, C=closed/holiday.

You MUST reply with a single JSON object:
{
  "actions": [ ... ],
  "answer": "<one short sentence in the SAME language/script the user spoke>"
}

Action shapes (use only these):
- {"type":"mark","staff":"<name>","status":"P|H|N|C","date":"YYYY-MM-DD"}
- {"type":"advance","staff":"<name>","amount":<number>,"note":"<optional>","date":"YYYY-MM-DD"}
- {"type":"cash","kind":"in|out","amount":<number>,"note":"<sale/expense reason>","date":"YYYY-MM-DD"}
- {"type":"set_rate","staff":"<name>","rate":<number>}
- {"type":"add_staff","name":"<name>"}
- {"type":"remove_staff","name":"<name>"}

Rules:
- Match staff names to the STAFF list even if pronunciation/spelling differs; use the exact spelling from STAFF.
- Resolve relative dates ("aaj/today", "kal/yesterday") using TODAY. Default to TODAY when unspecified.
- Cash book examples: "50 sale" means kind "in" with note "sale"; "150 tempo fare expense" means kind "out" with note "tempo fare". Use cash action for sales, cash received, expenses, rent, fare, transport, tea, purchase, and other shop cash movements.
- If the command produces one or more actions, set "answer" to "" (empty string). Do NOT confirm in words — the app shows a visual confirmation. This keeps replies fast and cheap.
- ONLY fill "answer" when the owner ASKS a question (earnings, who is absent, attendance) AND there are no actions: return "actions": [] and answer in one short sentence using SUMMARY data, matching the user's language. Amounts in ₹.
- If unclear, set actions to [] and ask a brief clarifying question in "answer".`

// Some models wrap JSON in markdown fences despite json mode; extract the object.
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) return raw.slice(start, end + 1)
  return raw
}

export async function runVoiceCommand(transcript: string, data: AppData, cursor: Date): Promise<AgentResult> {
  const simple = parseSimpleCashCommand(transcript, cursor)
  if (simple) return simple

  const context = buildContext(data, cursor)
  let raw = ''
  try {
    raw = await chat({
      system: SYSTEM,
      user: `CONTEXT:\n${context}\n\nOWNER SAID:\n"${transcript}"`,
      json: true,
    })
  } catch {
    const fallback = parseSimpleCashCommand(transcript, cursor)
    if (fallback) return fallback
    throw new Error('Mesh chat unavailable.')
  }

  let parsed: AgentResult
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    const fallback = parseSimpleCashCommand(transcript, cursor)
    if (fallback) return fallback
    return { actions: [], answer: transcript ? 'Samajh nahi aaya, dobara boliye.' : '' }
  }

  const validStaff = new Set(data.staff)
  const actions = (parsed.actions || []).filter((a) => {
    if (a.type === 'cash') return (a.kind === 'in' || a.kind === 'out') && Number(a.amount) > 0
    if (a.type === 'add_staff' || a.type === 'remove_staff') return Boolean(a.name)
    return validStaff.has(a.staff)
  })

  return { actions, answer: parsed.answer || '' }
}
