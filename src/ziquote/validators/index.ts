import { z } from 'zod'

const SUPPLY_TYPES    = ['INTRASTATE','INTERSTATE'] as const
const PAYMENT_MODES   = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const

// ─── Settings ────────────────────────────────────────────────
export const UpsertQuoteSettingsSchema = z.object({
  default_validity_days: z.number().int().positive().default(30),
  default_terms:         z.string().max(2000).optional(),
  default_footer:        z.string().max(500).optional(),
  default_notes:         z.string().max(1000).optional(),
  logo_url:              z.string().url().optional(),
  signature_url:         z.string().url().optional(),
  bank_name:             z.string().max(100).optional(),
  account_number:        z.string().max(30).optional(),
  ifsc:                  z.string().max(15).optional(),
  upi_id:                z.string().max(50).optional(),
})

// ─── Quote header ─────────────────────────────────────────────
export const CreateQuoteSchema = z.object({
  customer_name:    z.string().min(1).max(200),
  customer_gstin:   z.string().regex(/^[0-9A-Z]{15}$/).optional(),
  customer_address: z.string().max(400).optional(),
  customer_city:    z.string().max(100).optional(),
  customer_state:   z.string().max(100).optional(),
  customer_email:   z.string().email().optional(),
  customer_mobile:  z.string().regex(/^\d{10}$/).optional(),
  contact_id:       z.string().uuid().optional(),
  quote_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valid_until:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subject:          z.string().max(300).optional(),
  notes:            z.string().max(2000).optional(),
  terms:            z.string().max(2000).optional(),
  footer:           z.string().max(500).optional(),
  supply_type:      z.enum(SUPPLY_TYPES).default('INTRASTATE'),
  calc_sheet_id:    z.string().uuid().optional(),
})

export const UpdateQuoteSchema = CreateQuoteSchema.partial()

// ─── Quote items ─────────────────────────────────────────────
export const AddDocItemSchema = z.object({
  description:  z.string().min(1).max(500),
  hsn_sac:      z.string().max(20).optional(),
  qty:          z.number().positive(),
  unit:         z.string().max(30).optional(),
  rate_paise:   z.number().int().nonnegative(),
  discount_pct: z.number().min(0).max(100).default(0),
  gst_rate_pct: z.number().min(0).max(28).default(0),
  sort_order:   z.number().int().default(0),
})

export const UpdateDocItemSchema = AddDocItemSchema.partial()

// ─── Send / Accept / Reject ───────────────────────────────────
export const SendQuoteSchema = z.object({
  sent_note: z.string().max(500).optional(),
})

export const AcceptQuoteSchema = z.object({
  note: z.string().max(500).optional(),
})

export const RejectQuoteSchema = z.object({
  rejection_note: z.string().max(500).optional(),
})

export type CreateQuoteInput   = z.infer<typeof CreateQuoteSchema>
export type AddDocItemInput    = z.infer<typeof AddDocItemSchema>
