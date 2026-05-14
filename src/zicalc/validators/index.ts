import { z } from 'zod'

const SHEET_CATEGORIES = ['product_costing','project_estimate','service_pricing','custom'] as const
const ITEM_CATEGORIES  = ['material','labour','overhead','subcontract','other'] as const

export const CreateSheetSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  category:    z.enum(SHEET_CATEGORIES).default('custom'),
  currency:    z.string().length(3).default('INR'),
  margin_pct:  z.number().min(0).max(1000).default(20),
})

export const UpdateSheetSchema = CreateSheetSchema.partial().extend({
  is_archived: z.boolean().optional(),
})

export const AddCalcItemSchema = z.object({
  description: z.string().min(1).max(300),
  category:    z.enum(ITEM_CATEGORIES).default('other'),
  qty:         z.number().positive().default(1),
  unit:        z.string().max(30).optional(),
  rate_paise:  z.number().int().nonnegative(),
  sort_order:  z.number().int().default(0),
  notes:       z.string().max(300).optional(),
})

export const UpdateCalcItemSchema = AddCalcItemSchema.partial()

export type CreateSheetInput  = z.infer<typeof CreateSheetSchema>
export type AddCalcItemInput  = z.infer<typeof AddCalcItemSchema>
