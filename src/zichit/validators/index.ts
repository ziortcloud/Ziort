import { z } from 'zod'

const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const

export const UpsertChitSettingsSchema = z.object({
  organizer_name:    z.string().min(1).max(200).optional(),
  gstin:             z.string().max(15).optional(),
  foreman_charge_pct: z.number().min(0).max(20).optional(),
  penalty_rate_pct:  z.number().min(0).max(10).optional(),
})

export const CreateChitSchema = z.object({
  name:             z.string().min(1).max(200),
  chit_value_paise: z.number().int().positive(),
  num_members:      z.number().int().min(2),
  duration_months:  z.number().int().min(2),
  foreman_charge_pct: z.number().min(0).max(20).optional(),
  auction_type:     z.enum(['OPEN','SEALED']).optional(),
  start_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  notes:            z.string().max(500).optional(),
})

export const UpdateChitSchema = CreateChitSchema.partial().extend({
  status: z.enum(['FORMING','ACTIVE','COMPLETED','DISSOLVED']).optional(),
})

export const AddMemberSchema = z.object({
  name:           z.string().min(1).max(200),
  mobile:         z.string().regex(/^\d{10}$/).optional(),
  address:        z.string().max(400).optional(),
  id_proof_type:  z.string().max(50).optional(),
  id_proof_number: z.string().max(50).optional(),
  ticket_number:  z.number().int().positive(),
  contact_id:     z.string().uuid().optional(),
})

export const RecordContributionSchema = z.object({
  member_id:        z.string().uuid(),
  cycle_number:     z.number().int().positive(),
  amount_paise:     z.number().int().positive(),
  payment_mode:     z.enum(PAYMENT_MODES).optional(),
  reference_number: z.string().max(100).optional(),
  paid_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  penalty_paise:    z.number().int().min(0).optional(),
  notes:            z.string().max(300).optional(),
})

export const RecordAuctionSchema = z.object({
  member_id:           z.string().uuid(),
  cycle_number:        z.number().int().positive(),
  bid_amount_paise:    z.number().int().positive(),
  disbursed_at:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  disbursement_mode:   z.enum(PAYMENT_MODES).optional(),
  reference_number:    z.string().max(100).optional(),
  notes:               z.string().max(300).optional(),
})

export const CreatePigmySchema = z.object({
  holder_name:         z.string().min(1).max(200),
  mobile:              z.string().regex(/^\d{10}$/).optional(),
  address:             z.string().max(400).optional(),
  id_proof_type:       z.string().max(50).optional(),
  daily_amount_paise:  z.number().int().positive(),
  target_amount_paise: z.number().int().positive().optional(),
  opened_at:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contact_id:          z.string().uuid().optional(),
})

export const DepositPigmySchema = z.object({
  deposit_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_paise:     z.number().int().positive(),
  payment_mode:     z.enum(PAYMENT_MODES).optional(),
  reference_number: z.string().max(100).optional(),
  collected_by:     z.string().uuid().optional(),
  notes:            z.string().max(300).optional(),
})

export const ClosePigmySchema = z.object({
  closed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:    z.string().max(300).optional(),
})
