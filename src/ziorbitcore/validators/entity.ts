import { z } from 'zod'

export const EntityTypeEnum = z.enum([
  'sole_proprietor', 'company', 'partnership', 'trust', 'individual'
])

export const CreateEntitySchema = z.object({
  legal_name:       z.string().min(2).max(200),
  trade_name:       z.string().max(200).optional(),
  entity_type:      EntityTypeEnum,
  country_code:     z.string().length(2).default('IN'),
  business_id_type: z.string().optional(),
  business_id:      z.string().optional(),   // hashed server-side
  city:             z.string().max(100).optional(),
  state:            z.string().max(100).optional(),
})

export const UpdateEntitySchema = CreateEntitySchema.partial().omit({ entity_type: true })

export const CreateBranchSchema = z.object({
  name:         z.string().min(2).max(200),
  address:      z.string().max(500).optional(),
  city:         z.string().max(100).optional(),
  state:        z.string().max(100).optional(),
  country_code: z.string().length(2).default('IN'),
  is_primary:   z.boolean().default(false),
})

export const UpdateBranchSchema = CreateBranchSchema.partial()

export const MemberRoleEnum = z.enum([
  'owner', 'co_owner', 'partner', 'manager', 'staff', 'custom'
])

export const InviteMemberSchema = z.object({
  email:          z.string().email(),
  role:           MemberRoleEnum,
  branch_access:  z.array(z.string()).optional(),
  equity_percent: z.number().min(0).max(100).optional(),
  permissions:    z.record(z.boolean()).optional(),
  expires_at:     z.string().datetime().optional(),
})

export const UpdateMemberSchema = z.object({
  role:           MemberRoleEnum.optional(),
  branch_access:  z.array(z.string()).optional(),
  equity_percent: z.number().min(0).max(100).optional(),
  permissions:    z.record(z.boolean()).optional(),
  expires_at:     z.string().datetime().nullable().optional(),
  is_active:      z.boolean().optional(),
})

export const ProductCodeEnum = z.enum([
  'ZPN', 'ZFLT', 'ZLD', 'ZFD', 'ZCR', 'ZSHP', 'ZCHT',
  'ZBLD', 'ZYLD', 'ZPST', 'ZSCN', 'ZCLC', 'ZRCP',
  'ZNVC', 'ZQT', 'ZLDG', 'ZPRTN', 'ZPLS', 'ZND',
])

export const SubscribeProductSchema = z.object({
  product_code: ProductCodeEnum,
  plan_type:    z.enum(['trial', 'solo', 'plus', 'pro']).default('trial'),
  is_annual:    z.boolean().default(false),
})

export const CreateBizContactSchema = z.object({
  subscription_id: z.string().uuid(),
  contact_type:    z.enum(['CST', 'SUP', 'VND', 'AGT', 'PTR']),
  display_name:    z.string().min(1).max(200),
  mobile_display:  z.string().max(4).optional(),
  email_display:   z.string().email().optional(),
  tags:            z.array(z.string()).optional(),
})

export type CreateEntityInput     = z.infer<typeof CreateEntitySchema>
export type UpdateEntityInput     = z.infer<typeof UpdateEntitySchema>
export type CreateBranchInput     = z.infer<typeof CreateBranchSchema>
export type UpdateBranchInput     = z.infer<typeof UpdateBranchSchema>
export type InviteMemberInput     = z.infer<typeof InviteMemberSchema>
export type UpdateMemberInput     = z.infer<typeof UpdateMemberSchema>
export type SubscribeProductInput = z.infer<typeof SubscribeProductSchema>
export type CreateBizContactInput = z.infer<typeof CreateBizContactSchema>
