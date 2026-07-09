import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const itemValidator = v.object({
  name: v.string(),
  qty: v.number(),
  unitPrice: v.number(),
  amount: v.number(),
})

export const create = mutation({
  args: {
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(itemValidator),
    total: v.number(),
    status: v.optional(v.union(v.literal('draft'), v.literal('sent'))),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('bills', {
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      total: args.total,
      status: args.status ?? 'draft',
      createdAt: Date.now(),
    })
  },
})

export const markSent = mutation({
  args: { id: v.id('bills') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: 'sent' })
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('bills').order('desc').take(30)
  },
})
