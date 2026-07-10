import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const status = v.union(v.literal('P'), v.literal('N'), v.literal('H'), v.literal('C'))
const source = v.union(v.literal('manual'), v.literal('voice'))
// Owner of a row. Optional so pre-multi-tenant rows don't fail validation;
// every new row sets it, and all queries scope by the signed-in user.
const owner = v.optional(v.id('users'))

export default defineSchema({
  // --- auth ---
  users: defineTable({
    phone: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_phone', ['phone']),

  sessions: defineTable({
    token: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
  }).index('by_token', ['token']),

  otps: defineTable({
    phone: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
  }).index('by_phone', ['phone']),

  // --- per-user app data ---
  staff: defineTable({
    userId: owner,
    name: v.string(),
    rate: v.number(),
    order: v.number(),
  }).index('by_user', ['userId']),

  days: defineTable({
    userId: owner,
    date: v.string(), // YYYY-MM-DD
    marks: v.record(v.string(), status),
    locked: v.boolean(),
  }).index('by_user_date', ['userId', 'date']),

  advances: defineTable({
    userId: owner,
    staff: v.string(),
    date: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  }).index('by_user', ['userId']),

  cashEntries: defineTable({
    userId: owner,
    date: v.string(),
    kind: v.union(v.literal('in'), v.literal('out')),
    amount: v.number(),
    note: v.string(),
    source: v.optional(source),
  }).index('by_user', ['userId']),

  log: defineTable({
    userId: owner,
    at: v.number(),
    summary: v.string(),
    date: v.optional(v.string()),
    source: v.optional(source),
  }).index('by_user', ['userId']),

  // --- per-user billing ---
  customers: defineTable({
    userId: owner,
    name: v.string(),
    phone: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_phone', ['userId', 'phone']),

  bills: defineTable({
    userId: owner,
    customerName: v.string(),
    customerPhone: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        qty: v.number(),
        unitPrice: v.number(),
        amount: v.number(),
      }),
    ),
    total: v.number(),
    status: v.union(v.literal('draft'), v.literal('sent')),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  paymentRequests: defineTable({
    userId: owner,
    customerName: v.string(),
    customerPhone: v.string(),
    amount: v.number(),
    vpa: v.string(),
    upiLink: v.string(),
    note: v.string(),
    status: v.union(v.literal('pending'), v.literal('sent')),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // --- WhatsApp integration (shared: one linked number sends all messages) ---
  outbox: defineTable({
    to: v.string(),
    text: v.string(),
    imageBase64: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('sending'),
      v.literal('sent'),
      v.literal('failed'),
    ),
    error: v.optional(v.string()),
    attempts: v.number(),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  }).index('by_status', ['status']),

  waSession: defineTable({
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),

  waStatus: defineTable({
    status: v.union(
      v.literal('disconnected'),
      v.literal('qr'),
      v.literal('connecting'),
      v.literal('connected'),
    ),
    qr: v.optional(v.string()),
    updatedAt: v.number(),
  }),
})
