import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './model'

// Frontend enqueues a WhatsApp message; the Railway worker drains this table.
export const enqueue = mutation({
  args: {
    token: v.string(),
    to: v.string(),
    text: v.string(),
    imageBase64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token)
    return await ctx.db.insert('outbox', {
      to: args.to,
      text: args.text,
      imageBase64: args.imageBase64,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    })
  },
})

// Automated sends (order-bot replies, order notifications) — no user token,
// only callable from other Convex functions via ctx.runMutation(internal.*).
export const systemEnqueue = internalMutation({
  args: { to: v.string(), text: v.string(), imageBase64: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert('outbox', {
      to: args.to,
      text: args.text,
      imageBase64: args.imageBase64,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    })
  },
})

// Worker subscribes to this to get messages to send.
export const pending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('outbox')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()
  },
})

// Worker leases a row before sending (pending -> sending) so it isn't sent twice.
export const claim = mutation({
  args: { id: v.id('outbox') },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id)
    if (!row || row.status !== 'pending') return false
    await ctx.db.patch(id, { status: 'sending', attempts: row.attempts + 1 })
    return true
  },
})

export const markSent = mutation({
  args: { id: v.id('outbox') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: 'sent', sentAt: Date.now() })
  },
})

export const markFailed = mutation({
  args: { id: v.id('outbox'), error: v.string() },
  handler: async (ctx, { id, error }) => {
    await ctx.db.patch(id, { status: 'failed', error })
  },
})

// Recent activity for the billing UI.
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('outbox').order('desc').take(20)
    return rows
  },
})
