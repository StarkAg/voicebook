import { action, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

// Convex supports process.env at runtime but doesn't type it here.
declare const process: { env: Record<string, string | undefined> }

const MESH_BASE = process.env.MESH_BASE_URL || 'https://api.meshapi.ai/v1'
const HISTORY_LIMIT = 10

// A customer who has received at least one bill (see customerOwners, linked in
// customers.upsert) can message the shop's WhatsApp number directly and place
// a follow-up order via a short Mesh-powered chat. No prices are known here —
// the bot just captures items+qty; the shop owner confirms price in Billing.
const SYSTEM = `You are a WhatsApp ordering assistant for a local Indian shop (kirana/store). A returning customer is messaging you directly to place an order. Reply in the SAME language/script they use (Hindi/Hinglish/English) — short, warm, one or two sentences, like a real shop WhatsApp reply.

You do not know prices — the shop owner will confirm price and total after receiving the order. Your job: understand what items and quantities the customer wants, ask brief clarifying questions if something is unclear, and finalize once they confirm.

Reply with ONLY a JSON object, no commentary:
{"reply": "<your short WhatsApp reply>", "orderConfirmed": <true|false>, "items": [{"name":"<item>","qty":<number>}]}

Rules:
- orderConfirmed=false while still collecting or clarifying items.
- Set orderConfirmed=true ONLY when the customer has clearly confirmed the final list ("haan yehi bhej do", "confirm", "yes", "pakka", "ho jayega").
- "items" is the FULL current order (not just the latest message), Title Case, Roman script.
- If orderConfirmed=true, the reply should tell them the order has gone to the shop and they'll confirm price/delivery shortly.
- If the message isn't order-related, answer briefly and set orderConfirmed=false with empty items.`

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) return raw.slice(start, end + 1)
  return raw
}

// Called by the WhatsApp worker for every inbound message. Returns ok:false
// (silently ignored by the worker) if the sender isn't a known billed customer.
export const reply = action({
  args: { phone: v.string(), text: v.string() },
  handler: async (ctx, { phone, text }): Promise<{ ok: boolean }> => {
    const owner = await ctx.runQuery(internal.orderBot.findOwner, { phone })
    if (!owner) return { ok: false }

    await ctx.runMutation(internal.orderBot.appendChat, {
      ownerId: owner.userId,
      phone,
      role: 'customer',
      text,
    })

    const history = await ctx.runQuery(internal.orderBot.getHistory, {
      ownerId: owner.userId,
      phone,
    })

    const key = process.env.MESH_API_KEY
    if (!key) return { ok: false }

    let parsed: { reply?: string; orderConfirmed?: boolean; items?: { name: string; qty: number }[] } = {}
    try {
      const res = await fetch(`${MESH_BASE}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'auto',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            ...history.map((h) => ({
              role: h.role === 'customer' ? 'user' : 'assistant',
              content: h.text,
            })),
          ],
        }),
      })
      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content || ''
      parsed = JSON.parse(extractJson(raw))
    } catch {
      parsed = { reply: 'Thodi der mein try karein, abhi samajh nahi paaya.' }
    }

    const replyText = parsed.reply || 'Order mil gaya, shop ko bata diya.'
    await ctx.runMutation(internal.orderBot.appendChat, {
      ownerId: owner.userId,
      phone,
      role: 'assistant',
      text: replyText,
    })
    await ctx.runMutation(internal.outbox.systemEnqueue, { to: phone, text: replyText })

    if (parsed.orderConfirmed && parsed.items?.length) {
      const items = parsed.items
        .filter((i) => i.name && Number(i.qty) > 0)
        .map((i) => ({ name: i.name, qty: Number(i.qty), unitPrice: 0, amount: 0 }))
      if (items.length) {
        await ctx.runMutation(internal.bills.internalCreateForOwner, {
          ownerId: owner.userId,
          customerName: owner.customerName || phone,
          customerPhone: phone,
          items,
          total: 0,
        })
        if (owner.ownerPhone) {
          const list = items.map((i) => `• ${i.name} ×${i.qty}`).join('\n')
          await ctx.runMutation(internal.outbox.systemEnqueue, {
            to: owner.ownerPhone,
            text: `🛒 *Naya order* +91 ${phone} se:\n${list}\n\nBilling tab mein price confirm karke bill bhejein.`,
          })
        }
      }
    }

    return { ok: true }
  },
})

export const findOwner = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const link = await ctx.db
      .query('customerOwners')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .unique()
    if (!link) return null
    const user = await ctx.db.get(link.userId)
    const customer = await ctx.db
      .query('customers')
      .withIndex('by_user_phone', (q) => q.eq('userId', link.userId).eq('phone', phone))
      .unique()
    return { userId: link.userId, ownerPhone: user?.phone, customerName: customer?.name }
  },
})

export const appendChat = internalMutation({
  args: {
    ownerId: v.id('users'),
    phone: v.string(),
    role: v.union(v.literal('customer'), v.literal('assistant')),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('orderChats', { ...args, at: Date.now() })
  },
})

export const getHistory = internalQuery({
  args: { ownerId: v.id('users'), phone: v.string() },
  handler: async (ctx, { ownerId, phone }) => {
    const rows = await ctx.db
      .query('orderChats')
      .withIndex('by_owner_phone', (q) => q.eq('ownerId', ownerId).eq('phone', phone))
      .order('desc')
      .take(HISTORY_LIMIT)
    return rows.reverse()
  },
})
