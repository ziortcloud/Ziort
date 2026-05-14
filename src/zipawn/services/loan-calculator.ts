// ZiPawn — Loan Interest Calculator
// All amounts in paise (₹1 = 100 paise). No floating-point money.

export interface LoanCalculation {
  principal_paise:      number
  total_interest_paise: number
  total_due_paise:      number
  loan_end_date:        string   // YYYY-MM-DD
  daily_interest_paise: number   // for accrual tracking
  monthly_emi_paise:    number   // informational for mobile UI
}

// ─────────────────────────────────────────────
// Simple Interest: I = P × R × T / 100
// T in years = tenure_months / 12
// ─────────────────────────────────────────────
function simpleInterest(principal_paise: number, rate_pct: number, tenure_months: number): number {
  const t = tenure_months / 12
  return Math.round(principal_paise * rate_pct * t / 100)
}

// ─────────────────────────────────────────────
// Compound Interest: A = P × (1 + R/n)^(n×T)
// Compounded monthly (n=12) for pawn loans
// ─────────────────────────────────────────────
function compoundInterest(principal_paise: number, rate_pct: number, tenure_months: number): number {
  const r = rate_pct / 100 / 12   // monthly rate as decimal
  const n = tenure_months
  const amount = principal_paise * Math.pow(1 + r, n)
  return Math.round(amount - principal_paise)
}

// ─────────────────────────────────────────────
// Main calculator — called when creating a loan
// ─────────────────────────────────────────────
export function calculateLoan(opts: {
  principal_paise:   number
  interest_rate_pct: number
  interest_type:     'simple' | 'compound'
  tenure_months:     number
  loan_start_date:   string    // YYYY-MM-DD
}): LoanCalculation {
  const { principal_paise, interest_rate_pct, interest_type, tenure_months, loan_start_date } = opts

  const total_interest_paise =
    interest_type === 'compound'
      ? compoundInterest(principal_paise, interest_rate_pct, tenure_months)
      : simpleInterest(principal_paise, interest_rate_pct, tenure_months)

  const total_due_paise = principal_paise + total_interest_paise

  // Loan end date
  const start = new Date(loan_start_date)
  const end   = new Date(start)
  end.setMonth(end.getMonth() + tenure_months)
  const loan_end_date = end.toISOString().split('T')[0]

  const total_days = tenure_months * 30
  const daily_interest_paise  = Math.round(total_interest_paise / total_days)
  const monthly_emi_paise     = Math.round(total_due_paise / tenure_months)

  return { principal_paise, total_interest_paise, total_due_paise, loan_end_date, daily_interest_paise, monthly_emi_paise }
}

// ─────────────────────────────────────────────
// Apply payment — splits amount into interest + principal
// Interest-first allocation (standard pawn practice)
// ─────────────────────────────────────────────
export function allocatePayment(opts: {
  payment_paise:      number
  outstanding_paise:  number
  paid_paise:         number
  total_due_paise:    number
  principal_paise:    number
}): { principal_paise: number; interest_paise: number; new_outstanding: number } {
  const { payment_paise, outstanding_paise, total_due_paise, principal_paise, paid_paise } = opts
  const total_interest_paise = total_due_paise - principal_paise
  const interest_paid_so_far = Math.max(0, paid_paise - Math.min(paid_paise, principal_paise))
  const interest_remaining   = Math.max(0, total_interest_paise - interest_paid_so_far)

  const interest_paise  = Math.min(payment_paise, interest_remaining)
  const principal_paid  = payment_paise - interest_paise
  const new_outstanding = Math.max(0, outstanding_paise - payment_paise)

  return { principal_paise: principal_paid, interest_paise, new_outstanding }
}

// ─────────────────────────────────────────────
// Format paise → ₹ string (for API response / mobile display)
// ─────────────────────────────────────────────
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
