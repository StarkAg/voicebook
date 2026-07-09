import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('customers').order('desc').collect()
  },
})

// Upsert by phone so a repeat customer isn't duplicated.
export const upsert = mutation({
  args: { name: v.string(), phone: v.string() },
  handler: async (ctx, { name, phone }) => {
    const existing = await ctx.db
      .query('customers')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .unique()
    if (existing) {
      if (name && name !== existing.name) await ctx.db.patch(existing._id, { name })
      return existing._id
    }
    return await ctx.db.insert('customers', { name, phone, createdAt: Date.now() })
  },
})
