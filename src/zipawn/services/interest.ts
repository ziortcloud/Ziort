// ZiPawn — interest calculation engine
// Formula derived from zibizcore/src/products/zipawn reference.
// Rate stored as % per MONTH (e.g. 2.00 = 2%/month = 24%/year).
// All amounts in paise (BIGINT). No floating-point money.

export type InterestBasis = 'daily' | 'monthly'

/**
 * Calculate interest accrued over a period.
 * Daily:   principal × rate_pm × days / 3000
 *          (= principal × rate_pm% / 30 / 100 × days)
 * Monthly: principal × rate_pm × ceil(days / 30) / 100
 */
export function calcInterest(
  principal_paise: number,
  rate_pm: number,
  days: number,
  basis: InterestBasis,
): number {
  if (days <= 0 || principal_paise <= 0) return 0
  if (basis === 'monthly') {
    const months = Math.ceil(days / 30)
    return Math.round(principal_paise * rate_pm * months / 100)
  }
  // daily (default)
  return Math.round(principal_paise * rate_pm * days / 3000)
}

/**
 * Calculate penalty on overdue outstanding.
 * Same formula as interest but uses penalty_rate_pm.
 * Penalty starts after grace period.
 */
export function calcPenalty(
  outstanding_paise: number,
  penalty_rate_pm: number,
  overdue_days: number,     // days past maturity (already excluding grace)
  basis: InterestBasis = 'daily',
): number {
  if (overdue_days <= 0 || penalty_rate_pm <= 0 || outstanding_paise <= 0) return 0
  return calcInterest(outstanding_paise, penalty_rate_pm, overdue_days, basis)
}

/**
 * Days between two ISO date strings (inclusive end).
 * e.g. from 2026-01-01 to 2026-01-31 = 31 days
 */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = new Date(from)
  const b = new Date(to)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

/**
 * Overdue days: how many days past maturity (excluding grace period).
 * Returns 0 if not overdue or within grace period.
 */
export function overdueDays(maturity_date: string, grace_days: number, as_of?: string): number {
  const today = as_of ? new Date(as_of) : new Date()
  const maturity = new Date(maturity_date)
  today.setHours(0, 0, 0, 0)
  maturity.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - maturity.getTime()) / 86400000) - grace_days
  return Math.max(0, days)
}

/**
 * Calculate total outstanding interest from last_interest_paid_date to today.
 * last_paid_date: the date interest was last paid up to (inclusive).
 * Returns interest from (last_paid_date + 1 day) to today.
 */
export function calcAccruedInterest(opts: {
  principal_paise: number
  rate_pm: number
  basis: InterestBasis
  last_interest_paid_date: string | null
  opened_at: string
  as_of?: string
}): { interest_paise: number; from_date: string; to_date: string; days: number } {
  const today = opts.as_of ?? new Date().toISOString().split('T')[0]

  // Start of accrual: day after last payment, or loan open date
  let from: Date
  if (opts.last_interest_paid_date) {
    from = new Date(opts.last_interest_paid_date)
    from.setDate(from.getDate() + 1)
  } else {
    from = new Date(opts.opened_at)
    from.setHours(0, 0, 0, 0)
  }

  const to = new Date(today)
  to.setHours(0, 0, 0, 0)

  const from_date = from.toISOString().split('T')[0]
  const to_date   = to.toISOString().split('T')[0]
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1

  if (days <= 0) return { interest_paise: 0, from_date, to_date, days: 0 }

  const interest_paise = calcInterest(opts.principal_paise, opts.rate_pm, days, opts.basis)
  return { interest_paise, from_date, to_date, days }
}

/**
 * Calculate projected maturity date from loan start.
 */
export function maturityDate(opened_at: string, tenure_days: number): string {
  const d = new Date(opened_at)
  d.setDate(d.getDate() + tenure_days - 1)
  return d.toISOString().split('T')[0]
}
