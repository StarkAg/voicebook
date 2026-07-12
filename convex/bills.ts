import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './model'

const itemValidator = v.object({
  name: v.string(),
  qty: v.number(),
  unitPrice: v.number(),
  amount: v.number(),
})

export const create = mutation({
  args: {
    token: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(itemValidator),
    total: v.number(),
    status: v.optional(v.union(v.literal('draft'), v.literal('sent'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token)
    return await ctx.db.insert('bills', {
      userId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      total: args.total,
      status: args.status ?? 'draft',
      createdAt: Date.now(),
    })
  },
})

// Used by orderBot.reply — a customer's WhatsApp order creates a draft bill
// for the shop owner (no unauthenticated user token, so no requireUser here;
// only callable from other Convex functions via ctx.runMutation(internal.*)).
export const internalCreateForOwner = internalMutation({
  args: {
    ownerId: v.id('users'),
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(itemValidator),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('bills', {
      userId: args.ownerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      total: args.total,
      status: 'draft',
      createdAt: Date.now(),
    })
  },
})

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
      .query('bills')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(30)
  },
})
