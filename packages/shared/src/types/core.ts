// ============================================================
// Ziort — Core shared types
// Used by: ziort (server), ziort-web (SPA), ziort-mobile (API responses)
// ============================================================

export interface ZiSession {
  individualId: string
  authUserId: string
  email: string
  displayName: string
  avatarUrl?: string
  entities: ZiEntitySummary[]
  activeEntityId?: string
  activeSubscriptionId?: string
}

export interface ZiEntitySummary {
  id: string
  ziCode: string
  legalName: string
  tradeName?: string
  entityType: string
  countryCode: string
  logoUrl?: string
  role: string
  isPrimaryOwner: boolean
  isBillingOwner: boolean
}

export interface ZiApiResponse<T = unknown> {
  ok: true
  data: T
}

export interface ZiApiError {
  ok: false
  error: string
  code?: string
  details?: unknown
}

export type ZiApiResult<T = unknown> = ZiApiResponse<T> | ZiApiError

// Pagination
export interface ZiPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Code sequences
export interface ZiCodeResult {
  code: string
  prefix: string
  sequence: string
}

// Contact summary (safe — no PII)
export interface ZiContactSummary {
  id: string
  ziCode: string
  refCode: string
  displayName: string
  contactType: string
  mobileDisplay?: string
  emailDisplay?: string
  isVerified: boolean
  isActive: boolean
}

// Billing / wallet
export interface ZiWalletSummary {
  entityId: string
  balancePaise: number
  balanceFormatted: string
  currency: string
  updatedAt: string
}

export interface ZiBillingStats {
  walletBalance: number
  dailyCostPaise: number
  daysRemaining: number
  activeProducts: number
  activeUsers: number
  branches: number
}
