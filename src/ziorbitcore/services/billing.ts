// Ziort Core — Billing Calculation Service
// Pure TypeScript. No DB calls. Called by billing cron route.
import type { DailyCostBreakdown } from '../types/billing'
import {
  PLAN_DAILY_COST_PAISE, PLAN_INCLUDED_USERS,
  EXTRA_USER_DAILY_PAISE, EXTRA_BRANCH_DAILY_PAISE,
  BUNDLE_DISCOUNTS, BUNDLE_DISCOUNT_MAX,
} from '../types/billing'

export interface BillingInput {
  subscriptions: Array<{ plan_type: 'trial' | 'solo' | 'plus' | 'pro' }>
  active_user_count: number
  branch_count: number
  notification_cost_paise?: number
}

export function calculateDailyCost(input: BillingInput): DailyCostBreakdown {
  const { subscriptions, active_user_count, branch_count, notification_cost_paise = 0 } = input

  const billable      = subscriptions.filter(s => s.plan_type !== 'trial')
  const product_count = billable.length

  const product_cost_paise = billable.reduce(
    (sum, s) => sum + PLAN_DAILY_COST_PAISE[s.plan_type], 0
  )

  const max_included = billable.length === 0
    ? 1
    : Math.max(...billable.map(s => {
        const inc = PLAN_INCLUDED_USERS[s.plan_type]
        return inc === Infinity ? active_user_count : inc
      }))

  const extra_user_count  = Math.max(0, active_user_count - max_included)
  const user_cost_paise   = extra_user_count * EXTRA_USER_DAILY_PAISE

  const free_branches     = Math.max(active_user_count, 1)
  const extra_branch_count = Math.max(0, branch_count - free_branches)
  const branch_cost_paise  = extra_branch_count * EXTRA_BRANCH_DAILY_PAISE

  const bundle_discount_pct = product_count >= 5
    ? BUNDLE_DISCOUNT_MAX
    : (BUNDLE_DISCOUNTS[product_count] ?? 0)

  const base_cost_paise   = product_cost_paise + user_cost_paise + branch_cost_paise
  const discount_paise    = Math.floor(base_cost_paise * (bundle_discount_pct / 100))
  const daily_cost_paise  = base_cost_paise - discount_paise
  const total_cost_paise  = daily_cost_paise + notification_cost_paise

  return {
    product_count, product_cost_paise,
    extra_user_count, user_cost_paise,
    extra_branch_count, branch_cost_paise,
    bundle_discount_pct, discount_paise,
    base_cost_paise, daily_cost_paise,
    notification_cost_paise, total_cost_paise,
  }
}

export function paiseToCurrency(paise: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(paise / 100)
}

export function isLowBalance(
  balance_paise: number, monthly_cost_paise: number, threshold_pct = 20
): boolean {
  if (monthly_cost_paise <= 0) return false
  return balance_paise < (monthly_cost_paise * threshold_pct) / 100
}
