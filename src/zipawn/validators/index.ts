// ZiPawn — Zod validators for all API operations
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// SCHEMES
// ─────────────────────────────────────────────────────────────
export const CreateSchemeSchema = z.object({
  scheme_code:              z.string().min(2).max(20).toUpperCase(),
  scheme_name:              z.string().min(2).max(100),
  description:              z.string().max(500).optional(),
  interest_rate_pm:         z.number().min(0.01).max(10),    // % per month, max 10%/month
  interest_basis:           z.enum(['daily','monthly']).default('daily'),
  ltv_gold_916:             z.number().min(0).max(100).default(75),
  ltv_gold_999:             z.number().min(0).max(100).default(80),
  ltv_silver:               z.number().min(0).max(100).default(60),
  ltv_other:                z.number().min(0).max(100).default(50),
  min_loan_paise:           z.number().int().positive().default(100000),
  max_loan_paise:           z.number().int().positive().default(100000000),
  min_tenure_days:          z.number().int().min(1).default(30),
  max_tenure_days:          z.number().int().max(730).default(365),
  default_tenure_days:      z.number().int().default(180),
  processing_fee_type:      z.enum(['percentage','fixed']).default('percentage'),
  processing_fee_value:     z.number().min(0).default(0),
  processing_fee_max_paise: z.number().int().optional(),
  penalty_rate_pm:          z.number().min(0).max(10).default(0),
  penalty_grace_days:       z.number().int().min(0).default(0),
  rebate_enabled:           z.boolean().default(false),
  rebate_within_days:       z.number().int().positive().optional(),
  rebate_type:              z.enum(['percentage','fixed']).optional(),
  rebate_value:             z.number().min(0).optional(),
  is_default:               z.boolean().default(false),
})

export const UpdateSchemeSchema = CreateSchemeSchema.partial().omit({ scheme_code: true })
  .extend({ is_active: z.boolean().optional() })

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────
export const CreateCustomerSchema = z.object({
  full_name:             z.string().min(2).max(120),
  full_name_local:       z.string().max(120).optional(),
  mobile:                z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile'),
  alternate_mobile:      z.string().regex(/^\d{10}$/).optional(),
  email:                 z.string().email().optional(),
  dob:                   z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  gender:                z.enum(['male','female','other']).optional(),
  occupation:            z.string().max(80).optional(),
  address:               z.string().max(300).optional(),
  city:                  z.string().max(80).optional(),
  state:                 z.string().max(80).optional(),
  pincode:               z.string().length(6).optional(),
  branch_id:             z.string().uuid().optional(),
  // KYC
  id_type:               z.enum(['aadhaar','pan','voter_id','passport','driving_license']).optional(),
  id_number:             z.string().max(20).optional(),    // hashed before storing
  id_proof_url:          z.string().url().optional(),
  address_proof_type:    z.string().max(50).optional(),
  address_proof_url:     z.string().url().optional(),
  photo_url:             z.string().url().optional(),
  kyc_status:            z.enum(['pending','submitted','verified','rejected','waived']).default('pending'),
  kyc_notes:             z.string().max(500).optional(),
  // Nominee
  nominee_name:          z.string().max(100).optional(),
  nominee_relation:      z.string().max(50).optional(),
  nominee_dob:           z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  nominee_mobile:        z.string().regex(/^\d{10}$/).optional(),
  guardian_name:         z.string().max(100).optional(),
  guardian_id_type:      z.string().max(30).optional(),
  guardian_id_last6:     z.string().max(6).optional(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial()
  .omit({ mobile: true })
  .extend({
    kyc_verified_at: z.string().datetime().optional(),
    is_active:       z.boolean().optional(),
  })

export const BlacklistCustomerSchema = z.object({
  blacklist:        z.boolean(),
  reason:           z.string().min(5).max(300).optional(),
  blacklist_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
})

// ─────────────────────────────────────────────────────────────
// TICKETS
// ─────────────────────────────────────────────────────────────
export const CreateTicketSchema = z.object({
  customer_id: z.string().uuid(),
  branch_id:   z.string().uuid(),
  scheme_id:   z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────────────────────
export const AddItemSchema = z.object({
  category:    z.enum(['gold','silver','diamond','platinum','electronics','vehicle','property_doc','other']),
  description: z.string().min(2).max(255),
  purity:      z.string().max(20).optional(),
  weight_grams: z.number().positive().optional(),
  stones_count: z.number().int().min(0).optional(),
  stone_type:   z.string().max(50).optional(),
  hallmark_no:  z.string().max(50).optional(),
  item_photos:  z.array(z.string()).default([]),
})

export const UpdateItemSchema = z.object({
  description:  z.string().min(2).max(255).optional(),
  purity:       z.string().max(20).optional(),
  weight_grams: z.number().positive().optional(),
  stones_count: z.number().int().min(0).optional(),
  stone_type:   z.string().max(50).optional(),
  hallmark_no:  z.string().max(50).optional(),
  item_photos:  z.array(z.string()).optional(),
  status:       z.enum(['released','auctioned','lost']).optional(),
})

// ─────────────────────────────────────────────────────────────
// VALUATIONS
// ─────────────────────────────────────────────────────────────
export const AddValuationSchema = z.object({
  item_id:                    z.string().uuid(),
  metal_price_per_gram_paise: z.number().int().positive().optional(),  // required for weight-based items
  gross_value_paise:          z.number().int().positive(),
  deduction_pct:              z.number().min(0).max(50).default(0),
  valuation_notes:            z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// DISBURSAL (Ticket → Loan)
// ─────────────────────────────────────────────────────────────
export const DisburseTicketSchema = z.object({
  sanctioned_paise:       z.number().int().positive(),
  interest_rate_pm:       z.number().min(0.01).max(10),
  interest_basis:         z.enum(['daily','monthly']).default('daily'),
  tenure_days:            z.number().int().min(1).max(730),
  disbursement_mode:      z.enum(['cash','bank_transfer','upi','cheque']),
  bank_name:              z.string().max(100).optional(),
  account_last4:          z.string().length(4).optional(),
  upi_id:                 z.string().max(80).optional(),
  cheque_number:          z.string().max(20).optional(),
  customer_signature_url: z.string().url().optional(),
  witness_name:           z.string().max(100).optional(),
  witness_mobile:         z.string().regex(/^\d{10}$/).optional(),
})

// ─────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────
export const RecordPaymentSchema = z.object({
  payment_amount_paise: z.number().int().positive().max(99999900),  // max ₹9,99,999
  payment_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  payment_mode:         z.enum(['cash','upi','card','neft','rtgs','cheque']),
  cheque_number:        z.string().max(20).optional(),
  transaction_ref:      z.string().max(80).optional(),
  receipt_url:          z.string().url().optional(),
})

// ─────────────────────────────────────────────────────────────
// LOAN CLOSURE
// ─────────────────────────────────────────────────────────────
export const CloseLoanSchema = z.object({
  closure_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  closure_type:   z.enum(['full_payment','settlement','auction','waiver']),
  settlement_paise: z.number().int().nonnegative(),
  closure_notes:  z.string().max(500).optional(),
  release_items:  z.boolean().default(true),
})

// ─────────────────────────────────────────────────────────────
// LOAN RENEWAL
// ─────────────────────────────────────────────────────────────
export const RenewLoanSchema = z.object({
  renewal_type:         z.enum(['tenure_extension','topup','refinance']),
  renewal_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  new_tenure_days:      z.number().int().min(1).max(730),
  new_interest_rate_pm: z.number().min(0.01).max(10).optional(),  // optional: keep existing
  topup_paise:          z.number().int().nonnegative().default(0),
  pay_interest_now:     z.boolean().default(true),
  renewal_fee_paise:    z.number().int().nonnegative().default(0),
  remarks:              z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type CreateSchemeInput   = z.infer<typeof CreateSchemeSchema>
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
export type CreateTicketInput   = z.infer<typeof CreateTicketSchema>
export type AddItemInput        = z.infer<typeof AddItemSchema>
export type AddValuationInput   = z.infer<typeof AddValuationSchema>
export type DisburseTicketInput = z.infer<typeof DisburseTicketSchema>
export type RecordPaymentInput  = z.infer<typeof RecordPaymentSchema>
export type CloseLoanInput      = z.infer<typeof CloseLoanSchema>
export type RenewLoanInput      = z.infer<typeof RenewLoanSchema>
