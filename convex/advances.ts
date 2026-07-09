import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog } from './model'

const source = v.union(v.literal('manual'), v.literal('voice'))

export const add = mutation({
  args: {
    staff: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
    date: v.string(),
    source: v.optional(source),
  },
  handler: async (ctx, { staff, amount, note, date, source: src }) => {
    await ctx.db.insert('advances', { staff, amount, note: note || undefined, date })
    await addLog(ctx, { summary: `${staff}: advance ₹${amount}`, date, source: src })
  },
})

export const remove = mutation({
  args: { id: v.id('advances') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
