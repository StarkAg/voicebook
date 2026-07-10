import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog, requireUser } from './model'
import type { Id } from './_generated/dataModel'

const status = v.union(v.literal('P'), v.literal('N'), v.literal('H'), v.literal('C'))
const source = v.union(v.literal('manual'), v.literal('voice'))
const STATUS_LABEL: Record<string, string> = { P: 'Present', N: 'Absent', H: 'Half day', C: 'Closed' }

async function getOrCreateDay(ctx: any, userId: Id<'users'>, date: string) {
  const existing = await ctx.db
    .query('days')
    .withIndex('by_user_date', (q: any) => q.eq('userId', userId).eq('date', date))
    .unique()
  if (existing) return existing
  const id = await ctx.db.insert('days', { userId, date, marks: {}, locked: false })
  return await ctx.db.get(id)
}

export const setMark = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    staff: v.string(),
    status: v.union(status, v.null()),
    source: v.optional(source),
  },
  handler: async (ctx, { token, date, staff, status: st, source: src }) => {
    const userId = await requireUser(ctx, token)
    const day = await getOrCreateDay(ctx, userId, date)
    const marks = { ...day.marks }
    if (st === null) delete marks[staff]
    else marks[staff] = st
    await ctx.db.patch(day._id, { marks })
    if (st) await addLog(ctx, userId, { summary: `${staff}: ${STATUS_LABEL[st]}`, date, source: src })
  },
})

export const setDayAll = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    marks: v.record(v.string(), status),
    source: v.optional(source),
  },
  handler: async (ctx, { token, date, marks, source: src }) => {
    const userId = await requireUser(ctx, token)
    const day = await getOrCreateDay(ctx, userId, date)
    await ctx.db.patch(day._id, { marks })
    await addLog(ctx, userId, { summary: `Marked ${Object.keys(marks).length} staff`, date, source: src })
  },
})

export const lockDay = mutation({
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, { token, date }) => {
    const userId = await requireUser(ctx, token)
    const day = await getOrCreateDay(ctx, userId, date)
    await ctx.db.patch(day._id, { locked: true })
  },
})
