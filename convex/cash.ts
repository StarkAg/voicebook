import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, requireUser } from './model'

const kind = v.union(v.literal('in'), v.literal('out'))
const source = v.union(v.literal('manual'), v.literal('voice'))

export const add = mutation({
  args: {
    token: v.string(),
    kind,
    amount: v.number(),
    note: v.string(),
    date: v.string(),
    source: v.optional(source),
  },
  handler: async (ctx, { token, kind: k, amount, note, date, source: src }) => {
    const userId = await requireUser(ctx, token)
    const cleaned = note.trim() || (k === 'in' ? 'Cash inward' : 'Expense')
    await ctx.db.insert('cashEntries', { userId, kind: k, amount, note: cleaned, date, source: src })
    await addLog(ctx, userId, {
      summary: `${k === 'in' ? 'Cash in' : 'Expense'} ₹${amount} — ${cleaned}`,
      date,
      source: src,
    })
  },
})

export const remove = mutation({
  args: { token: v.string(), id: v.id('cashEntries') },
  handler: async (ctx, { token, id }) => {
    const userId = await requireUser(ctx, token)
    const row = await ctx.db.get(id)
    if (row && row.userId === userId) await ctx.db.delete(id)
  },
})
