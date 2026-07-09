import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    amount: v.number(),
    vpa: v.string(),
    upiLink: v.string(),
    note: v.string(),
    status: v.optional(v.union(v.literal('pending'), v.literal('sent'))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('paymentRequests', {
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
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('paymentRequests').order('desc').take(30)
  },
})
