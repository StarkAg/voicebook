import { query } from './_generated/server'

// Returns the whole app state already reshaped into the client's AppData shape,
// so the store bridge (src/lib/store.ts) can assign it directly. This is the
// single live subscription that feeds the React tree.
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const staffDocs = await ctx.db.query('staff').collect()
    staffDocs.sort((a, b) => a.order - b.order)

    const dayDocs = await ctx.db.query('days').collect()
    const advanceDocs = await ctx.db.query('advances').collect()
    const cashDocs = await ctx.db.query('cashEntries').collect()
    const logDocs = await ctx.db.query('log').collect()
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
