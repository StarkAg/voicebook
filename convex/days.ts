import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { addLog } from './model'

const status = v.union(v.literal('P'), v.literal('N'), v.literal('H'), v.literal('C'))
const source = v.union(v.literal('manual'), v.literal('voice'))
const STATUS_LABEL: Record<string, string> = { P: 'Present', N: 'Absent', H: 'Half day', C: 'Closed' }

async function getOrCreateDay(ctx: any, date: string) {
  const existing = await ctx.db
    .query('days')
    .withIndex('by_date', (q: any) => q.eq('date', date))
    .unique()
  if (existing) return existing
  const id = await ctx.db.insert('days', { date, marks: {}, locked: false })
  return await ctx.db.get(id)
}

export const setMark = mutation({
  args: {
    date: v.string(),
    staff: v.string(),
    status: v.union(status, v.null()),
    source: v.optional(source),
  },
  handler: async (ctx, { date, staff, status: st, source: src }) => {
    const day = await getOrCreateDay(ctx, date)
    const marks = { ...day.marks }
    if (st === null) delete marks[staff]
    else marks[staff] = st
    await ctx.db.patch(day._id, { marks })
    if (st) await addLog(ctx, { summary: `${staff}: ${STATUS_LABEL[st]}`, date, source: src })
  },
})

export const setDayAll = mutation({
  args: {
    date: v.string(),
    marks: v.record(v.string(), status),
    source: v.optional(source),
  },
  handler: async (ctx, { date, marks, source: src }) => {
    const day = await getOrCreateDay(ctx, date)
    await ctx.db.patch(day._id, { marks })
    await addLog(ctx, { summary: `Marked ${Object.keys(marks).length} staff`, date, source: src })
  },
})

export const lockDay = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const day = await getOrCreateDay(ctx, date)
    await ctx.db.patch(day._id, { locked: true })
  },
})
