import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './model'

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    let userId
    try {
      userId = await requireUser(ctx, token)
    } catch {
      return []
    }
    return await ctx.db
      .query('customers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const upsert = mutation({
  args: { token: v.string(), name: v.string(), phone: v.string() },
  handler: async (ctx, { token, name, phone }) => {
    const userId = await requireUser(ctx, token)

    // Link this phone to this owner so an inbound WhatsApp message from them
    // can be routed to this shop's order-bot (see convex/orderBot.ts).
    const link = await ctx.db
      .query('customerOwners')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .unique()
    if (link) await ctx.db.patch(link._id, { userId, updatedAt: Date.now() })
    else await ctx.db.insert('customerOwners', { phone, userId, updatedAt: Date.now() })

    const existing = await ctx.db
      .query('customers')
      .withIndex('by_user_phone', (q) => q.eq('userId', userId).eq('phone', phone))
      .unique()
    if (existing) {
      if (name && name !== existing.name) await ctx.db.patch(existing._id, { name })
      return existing._id
    }
    return await ctx.db.insert('customers', { userId, name, phone, createdAt: Date.now() })
  },
})
