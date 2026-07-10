import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, nextStaffOrder, requireUser } from './model'
import type { Id } from './_generated/dataModel'

async function byName(ctx: any, userId: Id<'users'>, name: string) {
  const all = await ctx.db
    .query('staff')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect()
  return all.find((s: any) => s.name === name) ?? null
}

export const add = mutation({
  args: { token: v.string(), name: v.string(), rate: v.optional(v.number()) },
  handler: async (ctx, { token, name, rate }) => {
    const userId = await requireUser(ctx, token)
    const trimmed = name.trim()
    if (!trimmed) return
    if (await byName(ctx, userId, trimmed)) return
    await ctx.db.insert('staff', {
      userId,
      name: trimmed,
      rate: rate ?? 0,
      order: await nextStaffOrder(ctx, userId),
    })
    await addLog(ctx, userId, { summary: `Added staff ${trimmed}` })
  },
})

export const remove = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, { token, name }) => {
    const userId = await requireUser(ctx, token)
    const doc = await byName(ctx, userId, name)
    if (doc) await ctx.db.delete(doc._id)
  },
})

export const setRate = mutation({
  args: { token: v.string(), staff: v.string(), rate: v.number() },
  handler: async (ctx, { token, staff, rate }) => {
    const userId = await requireUser(ctx, token)
    const doc = await byName(ctx, userId, staff)
    if (doc) await ctx.db.patch(doc._id, { rate })
    else
      await ctx.db.insert('staff', { userId, name: staff, rate, order: await nextStaffOrder(ctx, userId) })
  },
})
