import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog } from './model'

const source = v.union(v.literal('manual'), v.literal('voice'))

export const append = mutation({
  args: { summary: v.string(), date: v.optional(v.string()), source: v.optional(source) },
  handler: async (ctx, { summary, date, source: src }) => {
    await addLog(ctx, { summary, date, source: src })
  },
})
