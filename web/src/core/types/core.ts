// ─── Core domain types shared across all products ────────────────────────────

export interface ZiIndividual {
  id: string
  zi_code: string
  display_name: string
  avatar_url: string | null
  preferred_lang: string
  country_code: string
}

export interface ZiEntity {
  id: string
  zi_code: string
  legal_name: string
  trade_name: string | null
  entity_type: string
  city: string | null
  state: string | null
  is_active: boolean
  my_role: string
  membership_ref: string
  is_primary_owner: boolean
  is_billing_owner: boolean
}

export interface ZiSubscription {
  id: string
  zi_code: string
  ref_code: string
  entity_id: string
  product_code: ProductCode
  product_name: string
  plan_type: string
  status: 'trial' | 'active' | 'grace' | 'suspended' | 'cancelled'
  trial_end: string | null
  billing_start: string | null
}

// All product codes
export type ProductCode =
  | 'ZPN' | 'ZPLS' | 'ZND'  | 'ZFLT' | 'ZLD'  | 'ZDR'
  | 'ZFD' | 'ZCR'  | 'ZSHP' | 'ZCHT' | 'ZBLD'
  | 'ZYLD' | 'ZPST' | 'ZSCN' | 'ZCLC' | 'ZRCP'
  | 'ZNVC' | 'ZQT'  | 'ZLDG' | 'ZPRTN'

// Session state stored in Zustand + persisted to localStorage
export interface ZiSession {
  individual:          ZiIndividual
  email:               string
  entities:            ZiEntity[]
  activeEntity:        ZiEntity | null
  activeSubscriptions: ZiSubscription[]
  lastProductCode:     ProductCode | null
}

// Onboarding state machine (mirrors zibizcore App.jsx state machine)
export type OnboardingStage =
  | 'AUTH_REQUIRED'
  | 'ZIBIZ_USER_REQUIRED'
  | 'PRODUCT_SELECTION_REQUIRED'
  | 'READY'
