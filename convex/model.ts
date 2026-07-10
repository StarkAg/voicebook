import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// Resolve the signed-in user from a session token, or throw. Every data
// function calls this and scopes its reads/writes to the returned userId.
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
): Promise<Id<'users'>> {
  if (!token) throw new Error('Not authenticated')
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique()
  if (!session) throw new Error('Not authenticated')
  return session.userId
}

// Server-side log writer so AppData.log stays populated exactly as the views
// expect (the old client store wrote a log row on every mutation).
export async function addLog(
  ctx: MutationCtx,
  userId: Id<'users'>,
  entry: { summary: string; date?: string; source?: 'manual' | 'voice' },
) {
  await ctx.db.insert('log', {
    userId,
    at: Date.now(),
    summary: entry.summary,
    date: entry.date,
    source: entry.source,
  })
}

export async function nextStaffOrder(ctx: MutationCtx, userId: Id<'users'>): Promise<number> {
  const all = await ctx.db
    .query('staff')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  return all.length
}
