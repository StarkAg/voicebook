import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog } from './model'

const kind = v.union(v.literal('in'), v.literal('out'))
const source = v.union(v.literal('manual'), v.literal('voice'))

export const add = mutation({
  args: {
    kind,
    amount: v.number(),
    note: v.string(),
    date: v.string(),
    source: v.optional(source),
  },
  handler: async (ctx, { kind: k, amount, note, date, source: src }) => {
    const cleaned = note.trim() || (k === 'in' ? 'Cash inward' : 'Expense')
    await ctx.db.insert('cashEntries', { kind: k, amount, note: cleaned, date, source: src })
    await addLog(ctx, {
      summary: `${k === 'in' ? 'Cash in' : 'Expense'} ₹${amount} — ${cleaned}`,
      date,
      source: src,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('cashEntries') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
