// ZiPawn — Pawnbroking & Collateral Loan Management
// Product code: ZPN | Subscription prefix: ZPNA01
// Transaction codes (year-scoped): LN26A01, TKT26A01, PAY26A01, INT26A01, REL26A01, AUC26A01, VAL26A01

export type LoanStatus =
  | 'pending'
  | 'active'
  | 'interest_due'
  | 'overdue'
  | 'released'
  | 'auctioned'
  | 'written_off'

export type ItemCategory =
  | 'gold'
  | 'silver'
  | 'diamond'
  | 'electronics'
  | 'vehicle'
  | 'property_doc'
  | 'other'

export type PaymentMethod = 'cash' | 'upi' | 'neft' | 'rtgs' | 'cheque'

export interface ZpnCustomer {
  id: string
  zi_code: string           // CST prefix
  ref_code: string          // ZEA01ZPNA01CSTA01
  entity_id: string
  subscription_id: string
  full_name: string
  mobile_hash: string
  mobile_last4: string
  email?: string
  address?: string
  city?: string
  state?: string
  national_id_type?: string
  national_id_hash?: string
  national_id_last6?: string
  is_active: boolean
  created_at: string
}

export interface ZpnItem {
  id: string
  zi_code: string           // ITM prefix (internal, not in global sequences)
  entity_id: string
  subscription_id: string
  loan_id?: string
  category: ItemCategory
  description: string
  weight_grams?: number
  purity?: string           // e.g. "22K", "916"
  appraised_value_paise: number
  market_value_paise: number
  images: string[]          // R2 keys
  is_active: boolean
  created_at: string
}

export interface ZpnLoan {
  id: string
  zi_code: string           // LN prefix → LN26A01
  ref_code: string          // ZEA01ZPNA01LN26A01
  entity_id: string
  subscription_id: string
  branch_id: string
  customer_id: string
  principal_paise: number
  interest_rate_pct: number   // annual %
  interest_type: 'simple' | 'compound'
  tenure_months: number
  loan_start_date: string
  loan_end_date: string
  total_interest_paise: number
  total_due_paise: number
  paid_paise: number
  outstanding_paise: number
  status: LoanStatus
  last_interest_date?: string
  released_at?: string
  auctioned_at?: string
  created_by: string        // individual_id
  created_at: string
  updated_at: string
}

export interface ZpnPayment {
  id: string
  zi_code: string           // PAY prefix → PAY26A01
  ref_code: string
  entity_id: string
  subscription_id: string
  loan_id: string
  customer_id: string
  amount_paise: number
  principal_paise: number
  interest_paise: number
  payment_date: string
  payment_method: PaymentMethod
  receipt_number?: string
  created_by: string
  created_at: string
}

export interface CreateCustomerInput {
  full_name: string
  mobile: string
  email?: string
  address?: string
  city?: string
  state?: string
  national_id_type?: string
  national_id?: string
}

export interface CreateLoanInput {
  customer_id: string
  branch_id: string
  principal_paise: number
  interest_rate_pct: number
  interest_type: 'simple' | 'compound'
  tenure_months: number
  loan_start_date: string
  items: Array<{
    category: ItemCategory
    description: string
    weight_grams?: number
    purity?: string
    appraised_value_paise: number
    market_value_paise: number
  }>
}

export interface CreatePaymentInput {
  loan_id: string
  amount_paise: number
  payment_date: string
  payment_method: PaymentMethod
  receipt_number?: string
}
