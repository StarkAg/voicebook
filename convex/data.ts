import { query } from './_generated/server'
import { v } from 'convex/values'
import { requireUser } from './model'

const EMPTY = { staff: [], rates: {}, days: {}, advances: [], cashEntries: [], log: [] }

// Returns the signed-in user's whole app state, reshaped into the client's
// AppData shape. Empty (login gate) when not authenticated.
export const getAll = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    let userId
    try {
      userId = await requireUser(ctx, token)
    } catch {
      return EMPTY
    }

    const staffDocs = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    staffDocs.sort((a, b) => a.order - b.order)

    const dayDocs = await ctx.db
      .query('days')
      .withIndex('by_user_date', (q) => q.eq('userId', userId))
      .collect()
    const advanceDocs = await ctx.db
      .query('advances')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const cashDocs = await ctx.db
      .query('cashEntries')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const logDocs = await ctx.db
      .query('log')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    logDocs.sort((a, b) => b.at - a.at)

    const rates: Record<string, number> = {}
    for (const s of staffDocs) rates[s.name] = s.rate

    const days: Record<string, { date: string; marks: Record<string, string>; locked: boolean }> = {}
    for (const d of dayDocs) days[d.date] = { date: d.date, marks: d.marks, locked: d.locked }

    return {
      staff: staffDocs.map((s) => s.name),
      rates,
      days,
      advances: advanceDocs.map((a) => ({
        id: a._id,
        staff: a.staff,
        date: a.date,
        amount: a.amount,
        note: a.note,
      })),
      cashEntries: cashDocs.map((c) => ({
        id: c._id,
        date: c.date,
        kind: c.kind,
        amount: c.amount,
        note: c.note,
        source: c.source,
      })),
      log: logDocs.slice(0, 300).map((l) => ({
        at: l.at,
        summary: l.summary,
        date: l.date,
        source: l.source,
      })),
    }
  },
})
