import { z } from 'zod'

export const CreateRequirementSchema = z.object({
  title:             z.string().min(5).max(200),
  description:       z.string().min(10).max(2000),
  category:          z.string().min(2).max(80),
  sub_category:      z.string().max(80).optional(),
  quantity:          z.number().positive().optional(),
  unit:              z.string().max(20).optional(),
  budget_min_paise:  z.number().int().min(0).optional(),
  budget_max_paise:  z.number().int().min(0).optional(),
  location_city:     z.string().max(80).optional(),
  location_state:    z.string().max(80).optional(),
  delivery_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  is_urgent:         z.boolean().optional().default(false),
  is_anonymous:      z.boolean().optional().default(false),
  expires_days:      z.number().int().min(1).max(90).optional().default(30),
}).refine(
  d => !d.budget_min_paise || !d.budget_max_paise || d.budget_max_paise >= d.budget_min_paise,
  { message: 'Max budget must be ≥ min budget', path: ['budget_max_paise'] }
)

export const CreateProposalSchema = z.object({
  requirement_id: z.string().uuid(),
  price_paise:    z.number().int().positive(),
  delivery_days:  z.number().int().min(1).max(365),
  notes:          z.string().max(1000).optional(),
})

export const AcceptProposalSchema = z.object({
  proposal_id:          z.string().uuid(),
  agreed_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
})

export const CreateRatingSchema = z.object({
  deal_id: z.string().uuid(),
  score:   z.number().int().min(1).max(5),
  review:  z.string().max(500).optional(),
})

export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>
export type CreateProposalInput    = z.infer<typeof CreateProposalSchema>
export type AcceptProposalInput    = z.infer<typeof AcceptProposalSchema>
export type CreateRatingInput      = z.infer<typeof CreateRatingSchema>
