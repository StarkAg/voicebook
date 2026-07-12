import { action, mutation, query, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

// Convex supports process.env at runtime but doesn't type it here.
declare const process: { env: Record<string, string | undefined> }

// Fixed dev code so login works end-to-end before a real Fast2SMS key is set.
// TODO: remove DEV_CODE once Fast2SMS is live in production.
const DEV_CODE = '123456'
const OTP_TTL_MS = 5 * 60 * 1000
// Rate limits (per phone number).
const COOLDOWN_MS = 30 * 1000 // min gap between OTP sends
const WINDOW_MS = 60 * 60 * 1000 // rolling window
const MAX_PER_WINDOW = 5 // max OTP sends per window
const MAX_ATTEMPTS = 5 // max wrong verify tries per code

const tenDigits = (phone: string) => phone.replace(/\D/g, '').slice(-10)

// Send an OTP over SMS via Fast2SMS (if configured). Actions can do fetch.
// Rate limiting happens atomically in prepareOtp BEFORE any SMS is sent.
export const requestOtp = action({
  args: { phone: v.string() },
  handler: async (
    ctx,
    { phone },
  ): Promise<{ ok: boolean; devHint?: string; error?: string; retryAfter?: number }> => {
    const num = tenDigits(phone)
    if (num.length !== 10) return { ok: false, error: 'bad_number' }

    // Bypass numbers (set only on the dev deployment via OTP_BYPASS_NUMBERS):
    // skip SMS entirely and log in with the dev code. Never set on prod.
    const bypass = (process.env.OTP_BYPASS_NUMBERS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (bypass.includes(num)) return { ok: true, devHint: DEV_CODE }

    const prep = await ctx.runMutation(internal.auth.prepareOtp, { phone: num })
    if (!prep.allowed) return { ok: false, error: 'rate_limited', retryAfter: prep.retryAfter }
    const code = prep.code!

    const key = process.env.FAST2SMS_API_KEY
    if (key) {
      // Quick transactional route (route=q). The OTP route needs Fast2SMS
      // website verification; the quick route works once the wallet is funded.
      const msg = `Your VoiceBook OTP is ${code}. Kisi ko na batayein.`
      const url =
        `https://www.fast2sms.com/dev/bulkV2?authorization=${key}` +
        `&route=q&message=${encodeURIComponent(msg)}&flash=0&numbers=${num}`
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (data?.return === true) return { ok: true }
      } catch {
        // fall through to dev-code fallback
      }
      // SMS didn't go out (bad route/account/number) — keep login usable.
      return { ok: true, devHint: DEV_CODE }
    }
    // No SMS provider configured — tell the client the dev code works.
    return { ok: true, devHint: DEV_CODE }
  },
})

// Enforce send limits and mint the code atomically. Returns the code to send,
// or a retryAfter (seconds) when the caller is being rate limited.
export const prepareOtp = internalMutation({
  args: { phone: v.string() },
  handler: async (
    ctx,
    { phone },
  ): Promise<{ allowed: boolean; code?: string; retryAfter?: number }> => {
    const now = Date.now()
    const gen = () => Math.floor(100000 + Math.random() * 900000).toString()
    const existing = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .unique()

    if (!existing) {
      const code = gen()
      await ctx.db.insert('otps', {
        phone,
        code,
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
        sentCount: 1,
        windowStart: now,
      })
      return { allowed: true, code }
    }

    const lastSentAt = existing.lastSentAt ?? 0
    if (now - lastSentAt < COOLDOWN_MS) {
      return { allowed: false, retryAfter: Math.ceil((COOLDOWN_MS - (now - lastSentAt)) / 1000) }
    }
    let windowStart = existing.windowStart ?? now
    let sentCount = existing.sentCount ?? 0
    if (now - windowStart >= WINDOW_MS) {
      windowStart = now
      sentCount = 0
    }
    if (sentCount >= MAX_PER_WINDOW) {
      return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - windowStart)) / 1000) }
    }

    const code = gen()
    await ctx.db.patch(existing._id, {
      code,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      sentCount: sentCount + 1,
      windowStart,
    })
    return { allowed: true, code }
  },
})

export const verifyOtp = mutation({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, { phone, code }): Promise<{ token: string; name?: string } | null> => {
    const num = tenDigits(phone)
    const otp = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', num))
      .unique()

    if (code !== DEV_CODE) {
      if (!otp) return null
      // Too many wrong tries — burn the code so they must request a new one.
      if (otp.attempts >= MAX_ATTEMPTS) {
        await ctx.db.delete(otp._id)
        return null
      }
      if (otp.code !== code || otp.expiresAt <= Date.now()) {
        await ctx.db.patch(otp._id, { attempts: otp.attempts + 1 })
        return null
      }
    }
    if (otp) await ctx.db.delete(otp._id)

    // Upsert the user by phone.
    let user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', num))
      .unique()
    if (!user) {
      const id = await ctx.db.insert('users', { phone: num, createdAt: Date.now() })
      user = await ctx.db.get(id)
    }

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`
    await ctx.db.insert('sessions', { token, userId: user!._id, createdAt: Date.now() })
    return { token, name: user!.name }
  },
})

export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return null
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (!session) return null
    const user = await ctx.db.get(session.userId)
    return user ? { phone: user.phone, name: user.name } : null
  },
})

export const setName = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, { token, name }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (session) await ctx.db.patch(session.userId, { name: name.trim() })
  },
})

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (session) await ctx.db.delete(session._id)
  },
})
