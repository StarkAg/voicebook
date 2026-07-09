import { chat } from './mesh'
import { extractJson } from './agent'
import type { BillItem } from './types'

// Turns a shopkeeper's spoken sale into structured bill line items via Mesh chat.
const BILL_SYSTEM = `You convert an Indian shopkeeper's spoken sale into a bill. The owner speaks Hindi, Hinglish, or English.

Reply with ONLY a JSON object, no commentary:
{"items":[{"name":"<item>","qty":<number>,"unitPrice":<number>,"amount":<number>}]}

Rules:
- Parse each item's quantity, name, and price. Example: "do kilo cheeni 90" -> {"name":"Cheeni","qty":2,"unitPrice":90,"amount":180} when 90 is the per-unit price.
- If a number is clearly the TOTAL for that line (e.g. "5 packet biscuit ka 100"), set amount to it and derive unitPrice = amount / qty.
- Default qty to 1 when unspecified.
- Keep item names short, Title Case, in Roman script (transliterate Hindi).
- qty, unitPrice, amount must be plain numbers — no currency symbols, no commas.`

export async function parseBill(transcript: string): Promise<BillItem[]> {
  const raw = await chat({ system: BILL_SYSTEM, user: transcript, json: true })
  let parsed: { items?: unknown[] }
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    return []
  }
  const items = Array.isArray(parsed.items) ? parsed.items : []
  return items
    .map((raw) => {
      const i = raw as Record<string, unknown>
      const qty = Number(i.qty) || 1
      const unitPrice = Number(i.unitPrice) || 0
      const amount = Number(i.amount) || qty * unitPrice
      return {
        name: String(i.name || '').trim(),
        qty,
        unitPrice: unitPrice || (qty ? amount / qty : 0),
        amount,
      }
    })
    .filter((i) => i.name && i.amount > 0)
}

export const billTotal = (items: BillItem[]) =>
  items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
