// Ziort Core — Domain Types
// Mirrors the database schema exactly.
// All IDs are UUIDs. All codes follow the Alpha-Grow pattern.

export interface ZiIndividual {
  id: string
  zi_code: string             // ZUA01
  display_name: string
  country_code: string
  national_id_type: string | null
  national_id_hash: string | null
  national_id_last6: string | null
  national_id_verified: boolean
  auth_user_id: string | null
  avatar_url: string | null
  preferred_lang: string
  is_active: boolean
  created_at: string
  last_seen_at: string | null
}

export interface ZiIndividualEmail {
  id: string
  individual_id: string
  email: string
  is_current: boolean
  is_verified: boolean
  verified_at: string | null
  became_current_at: string
  replaced_at: string | null
}

export interface ZiIndividualMobile {
  id: string
  individual_id: string
  mobile_hash: string
  mobile_last4: string
  country_dial_code: string
  is_current: boolean
  is_verified: boolean
  verified_at: string | null
  became_current_at: string
  replaced_at: string | null
  cooldown_until: string | null
}

export type EntityType = 'sole_proprietor' | 'company' | 'partnership' | 'trust' | 'individual'

export interface ZiEntity {
  id: string
  zi_code: string             // ZEA01
  legal_name: string
  trade_name: string | null
  entity_type: EntityType
  country_code: string
  business_id_type: string | null
  business_id_hash: string | null
  business_id_last6: string | null
  business_id_verified: boolean
  city: string | null
  state: string | null
  is_active: boolean
  created_at: string
}

export interface ZiBranch {
  id: string
  zi_code: string             // ZBRA01
  entity_id: string
  ref_code: string            // ZEA01ZBRA01
  name: string
  address: string | null
  city: string | null
  state: string | null
  country_code: string
  is_primary: boolean
  is_active: boolean
  created_at: string
}

export type PlanType = 'trial' | 'solo' | 'plus' | 'pro'
export type SubscriptionStatus = 'trial' | 'active' | 'paused' | 'grace' | 'cancelled'

export const PRODUCT_CODES = {
  ZiPawn:    'ZPN',
  ZiFleet:   'ZFLT',
  ZiLoad:    'ZLD',
  ZiFood:    'ZFD',
  ZiCare:    'ZCR',
  ZiShop:    'ZSHP',
  ZiChit:    'ZCHT',
  ZiBuild:   'ZBLD',
  ZiYield:   'ZYLD',
  ZiPost:    'ZPST',
  ZiScan:    'ZSCN',
  ZiCalc:    'ZCLC',
  ZiReceipt: 'ZRCP',
  ZiInvoice: 'ZNVC',
  ZiQuote:   'ZQT',
  ZiLedger:  'ZLDG',
  ZiPartner: 'ZPRTN',
  ZiPulse:   'ZPLS',
  ZiNeed:    'ZND',
} as const

export type ProductCode = typeof PRODUCT_CODES[keyof typeof PRODUCT_CODES]

export interface ZiSubscription {
  id: string
  zi_code: string             // ZPNA01
  entity_id: string
  ref_code: string            // ZEA01ZPNA01
  product_code: ProductCode
  product_name: string
  plan_type: PlanType
  status: SubscriptionStatus
  trial_start: string | null
  trial_end: string | null
  billing_start: string | null
  is_annual: boolean
  max_users: number | null
  primary_owner_id: string | null
  billing_owner_id: string | null
  created_at: string
}

export type MemberRole = 'owner' | 'co_owner' | 'partner' | 'manager' | 'staff' | 'custom'

export interface ZiMembership {
  id: string
  ref_code: string            // ZEA01ZUA01
  entity_id: string
  individual_id: string
  role: MemberRole
  is_primary_owner: boolean
  is_billing_owner: boolean
  equity_percent: number | null
  permissions: Record<string, boolean> | null
  branch_access: string[] | null
  invited_by: string | null
  is_active: boolean
  joined_at: string | null
  expires_at: string | null
  created_at: string
}

export type ContactType = 'CST' | 'SUP' | 'VND' | 'AGT' | 'PTR'

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  CST: 'Customer',
  SUP: 'Supplier',
  VND: 'Vendor',
  AGT: 'Agent',
  PTR: 'Partner',
}

export interface ZiBizContact {
  id: string
  zi_code: string             // CSTA01
  ref_code: string            // ZEA01ZPNA01CSTA01
  entity_id: string
  subscription_id: string
  individual_id: string | null
  contact_type: ContactType
  display_name: string
  mobile_display: string | null
  email_display: string | null
  tags: string[] | null
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface ZiSession {
  individual: ZiIndividual
  currentEmail: string
  entities: ZiEntity[]
  activeEntity: ZiEntity | null
  activeBranch: ZiBranch | null
  activeSubscriptions: ZiSubscription[]
  membership: ZiMembership | null
}

export interface ZiCodeSequence {
  id: string
  code_prefix: string
  last_sequence: string
  total_issued: number
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  meta?: { total?: number; page?: number; per_page?: number }
}

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}
