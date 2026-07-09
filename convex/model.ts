import type { MutationCtx } from './_generated/server'

// Server-side log writer so AppData.log stays populated exactly as the views
// expect (the old client store wrote a log row on every mutation).
export async function addLog(
  ctx: MutationCtx,
  entry: { summary: string; date?: string; source?: 'manual' | 'voice' },
) {
  await ctx.db.insert('log', {
    at: Date.now(),
    summary: entry.summary,
    date: entry.date,
    source: entry.source,
  })
}

export async function nextStaffOrder(ctx: MutationCtx): Promise<number> {
  const all = await ctx.db.query('staff').collect()
  return all.length
}
