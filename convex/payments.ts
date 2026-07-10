import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './model'

export const create = mutation({
  args: {
    token: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    amount: v.number(),
    vpa: v.string(),
    upiLink: v.string(),
    note: v.string(),
    status: v.optional(v.union(v.literal('pending'), v.literal('sent'))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token)
    return await ctx.db.insert('paymentRequests', {
      userId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      amount: args.amount,
      vpa: args.vpa,
      upiLink: args.upiLink,
      note: args.note,
      status: args.status ?? 'pending',
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
      .query('paymentRequests')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(30)
  },
})
