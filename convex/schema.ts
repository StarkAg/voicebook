import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const status = v.union(v.literal('P'), v.literal('N'), v.literal('H'), v.literal('C'))
const source = v.union(v.literal('manual'), v.literal('voice'))

export default defineSchema({
  // --- migrated app data ---
  staff: defineTable({
    name: v.string(),
    rate: v.number(),
    order: v.number(),
  }).index('by_name', ['name']),

  days: defineTable({
    date: v.string(), // YYYY-MM-DD
    marks: v.record(v.string(), status),
    locked: v.boolean(),
  }).index('by_date', ['date']),

  advances: defineTable({
    staff: v.string(),
    date: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  }).index('by_staff', ['staff']),

  cashEntries: defineTable({
    date: v.string(),
    kind: v.union(v.literal('in'), v.literal('out')),
    amount: v.number(),
    note: v.string(),
    source: v.optional(source),
  }).index('by_date', ['date']),

  log: defineTable({
    at: v.number(),
    summary: v.string(),
    date: v.optional(v.string()),
    source: v.optional(source),
  }),

  // --- new billing tables ---
  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    createdAt: v.number(),
  }).index('by_phone', ['phone']),

  bills: defineTable({
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
  }),

  paymentRequests: defineTable({
    customerName: v.string(),
    customerPhone: v.string(),
    amount: v.number(),
    vpa: v.string(),
    upiLink: v.string(),
    note: v.string(),
    status: v.union(v.literal('pending'), v.literal('sent')),
    createdAt: v.number(),
  }),

  // --- WhatsApp integration ---
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

  // Live WhatsApp link status published by the worker for the Connect UI.
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
