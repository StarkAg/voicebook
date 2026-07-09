import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Key/value store for the Baileys auth session (creds + signal keys), so the
// WhatsApp login survives Railway redeploys instead of forcing a re-scan.
export const getAllSession = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('waSession').collect()
  },
})

export const setSessionKey = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query('waSession')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { value })
    else await ctx.db.insert('waSession', { key, value })
  },
})

export const removeSessionKey = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query('waSession')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const clearSession = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('waSession').collect()
    await Promise.all(all.map((r) => ctx.db.delete(r._id)))
  },
})
