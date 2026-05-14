import { z } from 'zod'

const SUPPLY_TYPES    = ['INTRASTATE','INTERSTATE'] as const
const INVOICE_TYPES   = ['TAX_INVOICE','PROFORMA','CREDIT_NOTE','DEBIT_NOTE'] as const
const PAYMENT_MODES   = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const

// ─── Settings ────────────────────────────────────────────────
export const UpsertInvoiceSettingsSchema = z.object({
  invoice_prefix:   z.string().max(20).optional(),
  default_due_days: z.number().int().min(0).default(30),
  default_terms:    z.string().max(2000).optional(),
  default_footer:   z.string().max(500).optional(),
  logo_url:         z.string().url().optional(),
  signature_url:    z.string().url().optional(),
  bank_name:        z.string().max(100).optional(),
  account_number:   z.string().max(30).optional(),
  ifsc:             z.string().max(15).optional(),
  upi_id:           z.string().max(50).optional(),
  payment_qr_url:   z.string().url().optional(),
})

// ─── Invoice header ───────────────────────────────────────────
export const CreateInvoiceSchema = z.object({
  invoice_type:     z.enum(INVOICE_TYPES).default('TAX_INVOICE'),
  customer_name:    z.string().min(1).max(200),
  customer_gstin:   z.string().regex(/^[0-9A-Z]{15}$/).optional(),
  customer_address: z.string().max(400).optional(),
  customer_city:    z.string().max(100).optional(),
  customer_state:   z.string().max(100).optional(),
  customer_email:   z.string().email().optional(),
  customer_mobile:  z.string().regex(/^\d{10}$/).optional(),
  contact_id:       z.string().uuid().optional(),
  invoice_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  place_of_supply:  z.string().max(100).optional(),
  supply_type:      z.enum(SUPPLY_TYPES).default('INTRASTATE'),
  subject:          z.string().max(300).optional(),
  notes:            z.string().max(2000).optional(),
  terms:            z.string().max(2000).optional(),
  footer:           z.string().max(500).optional(),
  quote_id:         z.string().uuid().optional(),   // if originated from a quote
})

export const UpdateInvoiceSchema = CreateInvoiceSchema.omit({ quote_id: true }).partial()

// ─── Invoice items ────────────────────────────────────────────
export const AddInvoiceItemSchema = z.object({
  description:  z.string().min(1).max(500),
  hsn_sac:      z.string().max(20).optional(),
  qty:          z.number().positive(),
  unit:         z.string().max(30).optional(),
  rate_paise:   z.number().int().nonnegative(),
  discount_pct: z.number().min(0).max(100).default(0),
  gst_rate_pct: z.number().min(0).max(28).default(0),
  sort_order:   z.number().int().default(0),
})

export const UpdateInvoiceItemSchema = AddInvoiceItemSchema.partial()

// ─── Record payment ───────────────────────────────────────────
export const RecordPaymentSchema = z.object({
  amount_paise:     z.number().int().positive(),
  payment_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_mode:     z.enum(PAYMENT_MODES).default('CASH'),
  reference_number: z.string().max(100).optional(),
  note:             z.string().max(300).optional(),
})

export type CreateInvoiceInput  = z.infer<typeof CreateInvoiceSchema>
export type AddInvoiceItemInput = z.infer<typeof AddInvoiceItemSchema>
export type RecordPaymentInput  = z.infer<typeof RecordPaymentSchema>
