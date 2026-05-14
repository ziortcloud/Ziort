// ZiPawn — payment waterfall calculator
// Allocation priority: penalty → interest → principal → overpayment
// All amounts in paise. Returns breakdown for DB insert.

import { calcAccruedInterest, calcPenalty, overdueDays } from './interest'

export interface WaterfallInput {
  payment_amount_paise:    number
  outstanding_paise:       number           // current principal outstanding
  interest_rate_pm:        number
  interest_basis:          'daily' | 'monthly'
  last_interest_paid_date: string | null
  opened_at:               string           // loan open timestamp (ISO)
  maturity_date:           string           // YYYY-MM-DD
  penalty_rate_pm:         number
  penalty_grace_days:      number
  payment_date:            string           // YYYY-MM-DD (date being paid for)
}

export interface WaterfallResult {
  penalty_portion_paise:   number
  interest_portion_paise:  number
  principal_portion_paise: number
  overpayment_paise:       number
  interest_from_date:      string
  interest_to_date:        string
  interest_days:           number
  outstanding_before_paise: number
  outstanding_after_paise:  number
  interest_accrued_paise:   number  // total accrued (may exceed payment)
  penalty_accrued_paise:    number  // total penalty (may exceed payment)
}

export function calculateWaterfall(input: WaterfallInput): WaterfallResult {
  const {
    payment_amount_paise, outstanding_paise, interest_rate_pm, interest_basis,
    last_interest_paid_date, opened_at, maturity_date,
    penalty_rate_pm, penalty_grace_days, payment_date,
  } = input

  // 1. Calculate accrued interest up to payment_date
  const accrual = calcAccruedInterest({
    principal_paise: outstanding_paise,
    rate_pm: interest_rate_pm,
    basis: interest_basis,
    last_interest_paid_date,
    opened_at,
    as_of: payment_date,
  })

  // 2. Calculate penalty (days overdue past grace period)
  const od_days = overdueDays(maturity_date, penalty_grace_days, payment_date)
  const penalty_accrued = calcPenalty(outstanding_paise, penalty_rate_pm, od_days, interest_basis)

  // 3. Waterfall allocation
  let remaining = payment_amount_paise

  const penalty_portion = Math.min(remaining, penalty_accrued)
  remaining -= penalty_portion

  const interest_portion = Math.min(remaining, accrual.interest_paise)
  remaining -= interest_portion

  const principal_portion = Math.min(remaining, outstanding_paise)
  remaining -= principal_portion

  const overpayment = remaining

  const outstanding_after = Math.max(0, outstanding_paise - principal_portion)

  return {
    penalty_portion_paise:    penalty_portion,
    interest_portion_paise:   interest_portion,
    principal_portion_paise:  principal_portion,
    overpayment_paise:        overpayment,
    interest_from_date:       accrual.from_date,
    interest_to_date:         accrual.to_date,
    interest_days:            accrual.days,
    outstanding_before_paise: outstanding_paise,
    outstanding_after_paise:  outstanding_after,
    interest_accrued_paise:   accrual.interest_paise,
    penalty_accrued_paise:    penalty_accrued,
  }
}

/** Format paise → ₹ string for responses */
export const paiseToRupees = (p: number) => parseFloat((p / 100).toFixed(2))
