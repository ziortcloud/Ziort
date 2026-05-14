// Ziort Core — Billing Types

export interface ZiWallet {
  id: string
  entity_id: string
  balance_paise: number
  currency: string
  updated_at: string
}

export interface ZiBillingLog {
  id: string
  entity_id: string
  transaction_type: 'debit' | 'credit' | 'refund' | 'adjustment'
  amount_paise: number
  description: string
  ref_code: string | null
  balance_after_paise: number
  created_at: string
  created_by: string | null
}

export interface ZiBillingSnapshot {
  id: string
  entity_id: string
  snapshot_date: string
  product_count: number
  active_user_count: number
  branch_count: number
  bundle_discount_pct: number
  base_cost_paise: number
  discount_paise: number
  daily_cost_paise: number
  notification_cost_paise: number
  total_cost_paise: number
  deducted: boolean
  deducted_at: string | null
}

export interface DailyCostBreakdown {
  product_count: number
  product_cost_paise: number
  extra_user_count: number
  user_cost_paise: number
  extra_branch_count: number
  branch_cost_paise: number
  bundle_discount_pct: number
  discount_paise: number
  base_cost_paise: number
  daily_cost_paise: number
  notification_cost_paise: number
  total_cost_paise: number
}

export const NOTIFICATION_RATES_PAISE = { sms: 15, whatsapp: 30, email: 2 } as const
export const PLAN_DAILY_COST_PAISE   = { trial: 0, solo: 1000, plus: 2000, pro: 3500 } as const
export const PLAN_INCLUDED_USERS     = { trial: 1, solo: 1, plus: 5, pro: Infinity } as const
export const EXTRA_USER_DAILY_PAISE   = 500
export const EXTRA_BRANCH_DAILY_PAISE = 500
export const BUNDLE_DISCOUNTS: Record<number, number> = { 1: 0, 2: 5, 3: 10, 4: 15 }
export const BUNDLE_DISCOUNT_MAX     = 20
export const LOW_BALANCE_THRESHOLD_PCT = 20
export const GRACE_PERIOD_DAYS       = 3
export const DATA_RETENTION_DAYS     = 90
