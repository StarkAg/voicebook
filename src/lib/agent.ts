import type { AppData, Status } from './types'
import { chat } from './mesh'
import { computePay, computeStats, statusFor } from './pay'
import { dateKey, ym } from './date'

export type Action =
  | { type: 'mark'; staff: string; status: Status; date: string }
  | { type: 'advance'; staff: string; amount: number; note?: string; date: string }
  | { type: 'set_rate'; staff: string; rate: number }
  | { type: 'add_staff'; name: string }
  | { type: 'remove_staff'; name: string }

export interface AgentResult {
  actions: Action[]
  answer: string
}

// Compact snapshot so the model can answer questions and resolve names/dates.
function buildContext(data: AppData, cursor: Date): string {
  const today = dateKey(new Date())
  const month = ym(cursor)
  const todayMarks = data.days[today]?.marks || {}

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
- {"type":"set_rate","staff":"<name>","rate":<number>}
- {"type":"add_staff","name":"<name>"}
- {"type":"remove_staff","name":"<name>"}

Rules:
- Match staff names to the STAFF list even if pronunciation/spelling differs; use the exact spelling from STAFF.
- Resolve relative dates ("aaj/today", "kal/yesterday") using TODAY. Default to TODAY when unspecified.
- If the owner only ASKS a question (earnings, who is absent, attendance), return "actions": [] and put the answer in "answer" using the SUMMARY data. Amounts in ₹.
- Keep "answer" to one natural sentence, matching the user's language. Confirm what you did.
- If unclear, set actions to [] and ask a brief clarifying question in "answer".`

export async function runVoiceCommand(transcript: string, data: AppData, cursor: Date): Promise<AgentResult> {
  const context = buildContext(data, cursor)
  const raw = await chat({
    system: SYSTEM,
    user: `CONTEXT:\n${context}\n\nOWNER SAID:\n"${transcript}"`,
    json: true,
  })

  let parsed: AgentResult
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { actions: [], answer: transcript ? 'Samajh nahi aaya, dobara boliye.' : '' }
  }

  const validStaff = new Set(data.staff)
  const actions = (parsed.actions || []).filter((a) => {
    if (a.type === 'add_staff') return Boolean(a.name)
    if ('staff' in a) return validStaff.has(a.staff) || a.type === 'remove_staff'
    return true
  })

  return { actions, answer: parsed.answer || '' }
}
