import { z } from 'zod'

const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const
const UNITS         = ['PCS','KG','G','LTR','ML','MTR','CM','BOX','PKT','DZ','NOS','OTH'] as const
const GST_RATES     = [0,0.25,1,1.5,3,5,7.5,12,18,28] as const
const SUPPLY_TYPES  = ['INTRASTATE','INTERSTATE'] as const

export const UpsertShopSettingsSchema = z.object({
  shop_name:                z.string().min(1).max(200).optional(),
  gstin:                    z.string().max(15).optional(),
  tax_regime:               z.enum(['GST','COMPOSITION','NONE']).optional(),
  supply_type:              z.enum(SUPPLY_TYPES).optional(),
  default_gst_rate_pct:     z.number().min(0).max(28).optional(),
  receipt_header:           z.string().max(500).optional(),
  receipt_footer:           z.string().max(500).optional(),
  receipt_show_gstin:       z.boolean().optional(),
  receipt_show_tax:         z.boolean().optional(),
  upi_id:                   z.string().max(100).optional(),
  upi_qr_url:               z.string().url().optional(),
  loyalty_enabled:          z.boolean().optional(),
  loyalty_points_per_rupee: z.number().min(0).optional(),
  loyalty_rupee_per_point:  z.number().min(0).optional(),
})

export const CreateCategorySchema = z.object({
  name:        z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  parent_id:   z.string().uuid().optional(),
  sort_order:  z.number().int().min(0).optional(),
  image_url:   z.string().url().optional(),
})

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  is_active: z.boolean().optional(),
})

export const CreateProductSchema = z.object({
  name:               z.string().min(1).max(200),
  description:        z.string().max(500).optional(),
  sku:                z.string().max(80).optional(),
  barcode:            z.string().max(50).optional(),
  hsn_sac_code:       z.string().max(10).optional(),
  unit:               z.enum(UNITS).optional(),
  category_id:        z.string().uuid().optional(),
  cost_price_paise:   z.number().int().min(0).optional(),
  selling_price_paise: z.number().int().min(0),
  mrp_paise:          z.number().int().min(0).optional(),
  gst_rate_pct:       z.number().refine(v => (GST_RATES as readonly number[]).includes(v), {
    message: 'Invalid GST rate',
  }).optional(),
  cess_rate_pct:      z.number().min(0).max(100).optional(),
  is_inclusive_tax:   z.boolean().optional(),
  track_stock:        z.boolean().optional(),
  image_url:          z.string().url().optional(),
  opening_stock:      z.number().min(0).optional(),  // seed zsh_stock on create
  reorder_level:      z.number().min(0).optional(),
  reorder_qty:        z.number().min(0).optional(),
})

export const UpdateProductSchema = CreateProductSchema.omit({ opening_stock: true }).partial().extend({
  is_active: z.boolean().optional(),
})

export const StockAdjustmentSchema = z.object({
  movement_type: z.enum(['PURCHASE_IN','RETURN_IN','ADJUSTMENT','WASTAGE','OPENING']),
  qty_change:    z.number().refine(v => v !== 0, { message: 'qty_change cannot be zero' }),
  note:          z.string().max(300).optional(),
})

export const CreateCustomerSchema = z.object({
  name:       z.string().min(1).max(200),
  mobile:     z.string().regex(/^\d{10}$/).optional(),
  email:      z.string().email().optional(),
  gstin:      z.string().max(15).optional(),
  address:    z.string().max(400).optional(),
  contact_id: z.string().uuid().optional(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  is_active: z.boolean().optional(),
})

// Bill item within a bill creation request
const BillItemInputSchema = z.object({
  product_id:   z.string().uuid().optional(),
  product_name: z.string().min(1).max(200),
  hsn_sac_code: z.string().max(10).optional(),
  unit:         z.enum(UNITS).optional(),
  barcode:      z.string().max(50).optional(),
  qty:          z.number().positive(),
  rate_paise:   z.number().int().min(0),
  discount_pct: z.number().min(0).max(100).optional(),
  gst_rate_pct: z.number().min(0).max(100).optional(),
  cess_rate_pct: z.number().min(0).max(100).optional(),
  sort_order:   z.number().int().min(0).optional(),
})

export const CreateBillSchema = z.object({
  customer_id:      z.string().uuid().optional(),
  customer_name:    z.string().max(200).optional(),
  customer_mobile:  z.string().regex(/^\d{10}$/).optional(),
  customer_gstin:   z.string().max(15).optional(),
  bill_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supply_type:      z.enum(SUPPLY_TYPES).optional(),
  branch_id:        z.string().uuid().optional(),
  notes:            z.string().max(500).optional(),
  items:            z.array(BillItemInputSchema).min(1, 'A bill must have at least one item'),
  loyalty_points_to_redeem: z.number().int().min(0).optional(),
})

export const CancelBillSchema = z.object({
  cancel_reason: z.string().min(1).max(300),
})

export const RecordBillPaymentSchema = z.object({
  payments: z.array(z.object({
    payment_mode:     z.enum(PAYMENT_MODES),
    amount_paise:     z.number().int().positive(),
    reference_number: z.string().max(100).optional(),
  })).min(1, 'At least one payment required'),
})
