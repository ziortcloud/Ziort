import { z } from 'zod'

export const CreateAccountSchema = z.object({
  name:             z.string().min(1).max(200),
  account_type:     z.enum(['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE']),
  account_group:    z.string().max(100).optional(),
  parent_id:        z.string().uuid().optional(),
  opening_balance:  z.number().int().optional(),         // paise, signed
  description:      z.string().max(400).optional(),
})

export const UpdateAccountSchema = CreateAccountSchema.partial().extend({
  is_active: z.boolean().optional(),
})

const VoucherLineSchema = z.object({
  account_id:  z.string().uuid(),
  entry_type:  z.enum(['DEBIT','CREDIT']),
  amount_paise: z.number().int().positive(),
  narration:   z.string().max(300).optional(),
  sort_order:  z.number().int().min(0).optional(),
})

export const CreateVoucherSchema = z.object({
  voucher_type:        z.enum(['JOURNAL','PAYMENT','RECEIPT','CONTRA','SALES','PURCHASE','DEBIT_NOTE','CREDIT_NOTE']),
  voucher_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  narration:           z.string().max(500).optional(),
  reference_number:    z.string().max(100).optional(),
  supply_type:         z.enum(['INTRASTATE','INTERSTATE']).optional(),
  gstin_party:         z.string().max(15).optional(),
  taxable_amount_paise: z.number().int().min(0).optional(),
  cgst_paise:          z.number().int().min(0).optional(),
  sgst_paise:          z.number().int().min(0).optional(),
  igst_paise:          z.number().int().min(0).optional(),
  gst_return_period:   z.string().regex(/^\d{4}-\d{2}$/).optional(),
  lines:               z.array(VoucherLineSchema).min(2, 'A voucher needs at least 2 lines'),
}).refine(data => {
  const total_debit  = data.lines.filter(l => l.entry_type === 'DEBIT').reduce((s, l) => s + l.amount_paise, 0)
  const total_credit = data.lines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + l.amount_paise, 0)
  return total_debit === total_credit
}, { message: 'Voucher is not balanced — total debits must equal total credits' })

export const CancelVoucherSchema = z.object({
  cancel_reason: z.string().min(1).max(300),
})

export const UpsertGstReturnSchema = z.object({
  return_type:         z.enum(['GSTR1','GSTR3B','GSTR2A','GSTR9']),
  return_period:       z.string().regex(/^\d{4}-\d{2}$/),
  status:              z.enum(['PENDING','FILED','REVISED']).optional(),
  filed_at:            z.string().optional(),
  arn_number:          z.string().max(50).optional(),
  total_taxable_paise: z.number().int().min(0).optional(),
  total_cgst_paise:    z.number().int().min(0).optional(),
  total_sgst_paise:    z.number().int().min(0).optional(),
  total_igst_paise:    z.number().int().min(0).optional(),
  notes:               z.string().max(400).optional(),
})
