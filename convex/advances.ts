import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, requireUser } from './model'

const source = v.union(v.literal('manual'), v.literal('voice'))

export const add = mutation({
  args: {
    token: v.string(),
    staff: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
    date: v.string(),
    source: v.optional(source),
  },
  handler: async (ctx, { token, staff, amount, note, date, source: src }) => {
    const userId = await requireUser(ctx, token)
    await ctx.db.insert('advances', { userId, staff, amount, note: note || undefined, date })
    await addLog(ctx, userId, { summary: `${staff}: advance ₹${amount}`, date, source: src })
  },
})

export const remove = mutation({
  args: { token: v.string(), id: v.id('advances') },
  handler: async (ctx, { token, id }) => {
    const userId = await requireUser(ctx, token)
    const row = await ctx.db.get(id)
    if (row && row.userId === userId) await ctx.db.delete(id)
  },
})
