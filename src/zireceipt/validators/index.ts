import { z } from 'zod'

const RECEIPT_TYPES = ['INVOICE_PAYMENT','ADVANCE','REFUND','SECURITY_DEPOSIT','OTHER'] as const
const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const

export const CreateReceiptSchema = z.object({
  receipt_type:     z.enum(RECEIPT_TYPES).default('ADVANCE'),
  payer_name:       z.string().min(1).max(200),
  payer_mobile:     z.string().regex(/^\d{10}$/).optional(),
  payer_gstin:      z.string().regex(/^[0-9A-Z]{15}$/).optional(),
  payer_address:    z.string().max(400).optional(),
  contact_id:       z.string().uuid().optional(),
  receipt_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount_paise:     z.number().int().positive(),
  payment_mode:     z.enum(PAYMENT_MODES).default('CASH'),
  reference_number: z.string().max(100).optional(),
  purpose:          z.string().max(300).optional(),
  notes:            z.string().max(500).optional(),
})

export const CancelReceiptSchema = z.object({
  cancel_reason: z.string().min(1).max(300),
})

export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>
