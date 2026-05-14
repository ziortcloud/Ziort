import { z } from 'zod'

const PAYMENT_MODES = ['CASH','UPI','NEFT','RTGS','IMPS','CHEQUE','CARD','WALLET','OTHER'] as const

export const UpsertFoodSettingsSchema = z.object({
  restaurant_name:      z.string().min(1).max(200).optional(),
  fssai_number:         z.string().max(20).optional(),
  gstin:                z.string().max(15).optional(),
  supply_type:          z.enum(['INTRASTATE','INTERSTATE']).optional(),
  default_gst_rate_pct: z.number().min(0).max(28).optional(),
  service_charge_pct:   z.number().min(0).max(20).optional(),
  bill_header:          z.string().max(500).optional(),
  bill_footer:          z.string().max(500).optional(),
  upi_id:               z.string().max(100).optional(),
  table_booking_enabled: z.boolean().optional(),
  kot_printer_enabled:  z.boolean().optional(),
})

export const CreateSectionSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  sort_order:  z.number().int().min(0).optional(),
})

export const CreateTableSchema = z.object({
  name:       z.string().min(1).max(50),
  zi_code:    z.string().min(1).max(10),
  section_id: z.string().uuid().optional(),
  capacity:   z.number().int().min(1).optional(),
  qr_code_url: z.string().url().optional(),
})

export const UpdateTableSchema = CreateTableSchema.partial().extend({
  status:    z.enum(['AVAILABLE','OCCUPIED','RESERVED','CLEANING']).optional(),
  is_active: z.boolean().optional(),
})

export const CreateMenuCategorySchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  sort_order:  z.number().int().min(0).optional(),
  image_url:   z.string().url().optional(),
})

export const CreateMenuItemSchema = z.object({
  name:             z.string().min(1).max(200),
  description:      z.string().max(500).optional(),
  category_id:      z.string().uuid().optional(),
  is_veg:           z.boolean().optional(),
  hsn_sac_code:     z.string().max(10).optional(),
  base_price_paise: z.number().int().min(0),
  gst_rate_pct:     z.number().min(0).max(28).optional(),
  prep_time_minutes: z.number().int().min(0).optional(),
  image_url:        z.string().url().optional(),
  tags:             z.array(z.string().max(30)).max(10).optional(),
})

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  is_available: z.boolean().optional(),
})

const OrderItemInputSchema = z.object({
  menu_item_id:         z.string().uuid().optional(),
  item_name:            z.string().min(1).max(200),
  is_veg:               z.boolean().optional(),
  qty:                  z.number().positive(),
  rate_paise:           z.number().int().min(0),
  discount_pct:         z.number().min(0).max(100).optional(),
  gst_rate_pct:         z.number().min(0).max(28).optional(),
  special_instructions: z.string().max(300).optional(),
  sort_order:           z.number().int().min(0).optional(),
})

export const CreateOrderSchema = z.object({
  table_id:        z.string().uuid().optional(),
  order_type:      z.enum(['DINE_IN','TAKEAWAY','DELIVERY','SWIGGY','ZOMATO']).optional(),
  customer_name:   z.string().max(200).optional(),
  customer_mobile: z.string().regex(/^\d{10}$/).optional(),
  num_guests:      z.number().int().min(1).optional(),
  notes:           z.string().max(500).optional(),
  items:           z.array(OrderItemInputSchema).min(1),
})

export const AddOrderItemsSchema = z.object({
  items: z.array(OrderItemInputSchema).min(1),
})

export const UpdateKotStatusSchema = z.object({
  status: z.enum(['PREPARING','READY','SERVED']),
})

export const RecordOrderPaymentSchema = z.object({
  payments: z.array(z.object({
    payment_mode:     z.enum(PAYMENT_MODES),
    amount_paise:     z.number().int().positive(),
    reference_number: z.string().max(100).optional(),
  })).min(1),
})

export const CancelOrderSchema = z.object({
  cancel_reason: z.string().min(1).max(300),
})
