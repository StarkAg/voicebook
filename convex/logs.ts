import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, requireUser } from './model'

const source = v.union(v.literal('manual'), v.literal('voice'))

export const append = mutation({
  args: { token: v.string(), summary: v.string(), date: v.optional(v.string()), source: v.optional(source) },
  handler: async (ctx, { token, summary, date, source: src }) => {
    const userId = await requireUser(ctx, token)
    await addLog(ctx, userId, { summary, date, source: src })
  },
})
