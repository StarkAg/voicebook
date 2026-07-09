import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, nextStaffOrder } from './model'

async function byName(ctx: any, name: string) {
  return await ctx.db
    .query('staff')
    .withIndex('by_name', (q: any) => q.eq('name', name))
    .unique()
}

export const add = mutation({
  args: { name: v.string(), rate: v.optional(v.number()) },
  handler: async (ctx, { name, rate }) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (await byName(ctx, trimmed)) return
    await ctx.db.insert('staff', {
      name: trimmed,
      rate: rate ?? 0,
      order: await nextStaffOrder(ctx),
    })
    await addLog(ctx, { summary: `Added staff ${trimmed}` })
  },
})

export const remove = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const doc = await byName(ctx, name)
    if (doc) await ctx.db.delete(doc._id)
  },
})

export const setRate = mutation({
  args: { staff: v.string(), rate: v.number() },
  handler: async (ctx, { staff, rate }) => {
    const doc = await byName(ctx, staff)
    if (doc) await ctx.db.patch(doc._id, { rate })
    else await ctx.db.insert('staff', { name: staff, rate, order: await nextStaffOrder(ctx) })
  },
})

// Seed the default roster once (called by the app on first load when empty).
export const ensureSeed = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, { names }) => {
    const existing = await ctx.db.query('staff').take(1)
    if (existing.length > 0) return
    let order = 0
    for (const name of names) {
      await ctx.db.insert('staff', { name, rate: 0, order: order++ })
    }
  },
})
