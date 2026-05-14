// GET /api/v1/entities/:entityId/zipawn/:subscriptionId/dashboard
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const now = new Date()
  const todayStr   = now.toISOString().split('T')[0]
  const weekAgo    = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  const weekFromNow = new Date(now); weekFromNow.setDate(now.getDate() + 7)
  const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

  // 6-month window for chart
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

  // Week boundaries for profit
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  const base = { entity_id: entityId, subscription_id: subscriptionId }

  // ── Parallel queries ─────────────────────────────────────────────────────────
  const [
    activeLoansRes,
    overdueLoansRes,
    dueTodayRes,
    upcomingRes,
    todayPaymentsRes,
    newLoansTodayRes,
    weekPaymentsRes,
    monthPaymentsRes,
    yearPaymentsRes,
    totalCustomersRes,
    chartLoansRes,
    overdueListRes,
  ] = await Promise.all([
    // Active + interest_due loans
    db.from('zpn_loans')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .in('status', ['active', 'interest_due']),

    // Overdue loans count + outstanding
    db.from('zpn_loans')
      .select('id,outstanding_paise', { count: 'exact' })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .in('status', ['overdue']),

    // Due today
    db.from('zpn_loans')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .eq('loan_end_date', todayStr)
      .in('status', ['active', 'interest_due', 'overdue']),

    // Upcoming (due in next 7 days, not today)
    db.from('zpn_loans')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .gt('loan_end_date', todayStr)
      .lte('loan_end_date', weekFromNowStr)
      .in('status', ['active', 'interest_due']),

    // Payments today (collected)
    db.from('zpn_payments')
      .select('amount_paise,interest_paise')
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .eq('payment_date', todayStr),

    // New loans today
    db.from('zpn_loans')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .eq('loan_start_date', todayStr),

    // Payments this week (for weekly profit)
    db.from('zpn_payments')
      .select('interest_paise')
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .gte('payment_date', startOfWeek.toISOString().split('T')[0]),

    // Payments this month
    db.from('zpn_payments')
      .select('interest_paise')
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .gte('payment_date', startOfMonth.toISOString().split('T')[0]),

    // Payments this year
    db.from('zpn_payments')
      .select('interest_paise')
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .gte('payment_date', startOfYear.toISOString().split('T')[0]),

    // Total unique customers
    db.from('zpn_customers')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .eq('is_active', true),

    // 6-month loan chart (opened_at approximated by created_at or loan_start_date)
    db.from('zpn_loans')
      .select('loan_start_date,principal_paise')
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .gte('loan_start_date', sixMonthsAgoStr)
      .order('loan_start_date', { ascending: true }),

    // Overdue loans list for table
    db.from('zpn_loans')
      .select(`
        id, zi_code, principal_paise, outstanding_paise, loan_end_date,
        zpn_customers ( id, full_name, mobile_last4 )
      `)
      .eq('entity_id', entityId)
      .eq('subscription_id', subscriptionId)
      .in('status', ['overdue'])
      .order('loan_end_date', { ascending: true })
      .limit(15),
  ])

  if (activeLoansRes.error)    return serverError('active loans query failed', activeLoansRes.error)
  if (overdueLoansRes.error)   return serverError('overdue loans query failed', overdueLoansRes.error)
  if (dueTodayRes.error)       return serverError('due today query failed', dueTodayRes.error)
  if (upcomingRes.error)       return serverError('upcoming query failed', upcomingRes.error)
  if (todayPaymentsRes.error)  return serverError('payments today query failed', todayPaymentsRes.error)
  if (newLoansTodayRes.error)  return serverError('new loans query failed', newLoansTodayRes.error)
  if (weekPaymentsRes.error)   return serverError('week payments query failed', weekPaymentsRes.error)
  if (monthPaymentsRes.error)  return serverError('month payments query failed', monthPaymentsRes.error)
  if (yearPaymentsRes.error)   return serverError('year payments query failed', yearPaymentsRes.error)
  if (totalCustomersRes.error) return serverError('customers query failed', totalCustomersRes.error)
  if (chartLoansRes.error)     return serverError('chart query failed', chartLoansRes.error)
  if (overdueListRes.error)    return serverError('overdue list query failed', overdueListRes.error)

  // ── Compute aggregates ────────────────────────────────────────────────────────
  const activeCount  = activeLoansRes.count ?? 0
  const overdueCount = overdueLoansRes.count ?? 0
  const totalActive  = activeCount + overdueCount

  const overdueOutstanding = (overdueLoansRes.data ?? [])
    .reduce((s: number, r: any) => s + (r.outstanding_paise ?? 0), 0)

  const collectedToday = (todayPaymentsRes.data ?? [])
    .reduce((s: number, r: any) => s + (r.amount_paise ?? 0), 0)

  const interestWeekly  = (weekPaymentsRes.data  ?? []).reduce((s: number, r: any) => s + (r.interest_paise ?? 0), 0)
  const interestMonthly = (monthPaymentsRes.data ?? []).reduce((s: number, r: any) => s + (r.interest_paise ?? 0), 0)
  const interestYearly  = (yearPaymentsRes.data  ?? []).reduce((s: number, r: any) => s + (r.interest_paise ?? 0), 0)

  // Risk level
  const riskPct = totalActive > 0 ? (overdueCount / totalActive) * 100 : 0
  const riskLevel =
    riskPct < 5   ? 'low' :
    riskPct < 15  ? 'medium' :
    riskPct < 30  ? 'high' : 'critical'

  // All outstanding (active + overdue)
  // We use overdueOutstanding + estimate active by summing outstanding from overdue list only;
  // we skip a full sum for performance and return counts instead
  const totalOutstanding = overdueOutstanding  // front-end can compute from loan list if needed

  // ── Build 6-month chart ───────────────────────────────────────────────────────
  const chartMap = new Map<string, { loans: number; amount: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    chartMap.set(key, { loans: 0, amount: 0 })
  }
  for (const row of chartLoansRes.data ?? []) {
    const key = row.loan_start_date.slice(0, 7)
    const entry = chartMap.get(key)
    if (entry) {
      entry.loans++
      entry.amount += row.principal_paise ?? 0
    }
  }
  const chart = Array.from(chartMap.entries()).map(([month, v]) => ({
    month,
    loans: v.loans,
    amount: v.amount,
  }))

  // ── Overdue list ─────────────────────────────────────────────────────────────
  const overdueList = (overdueListRes.data ?? []).map((r: any) => {
    const endDate = new Date(r.loan_end_date)
    const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / 86_400_000)
    const cust = r.zpn_customers as any
    return {
      id:              r.id,
      zi_code:         r.zi_code,
      customer_name:   cust?.full_name ?? '—',
      mobile_last4:    cust?.mobile_last4 ?? '—',
      principal_paise: r.principal_paise,
      outstanding_paise: r.outstanding_paise,
      loan_end_date:   r.loan_end_date,
      days_overdue:    Math.max(0, daysOverdue),
    }
  })

  return ok({
    today: {
      due_count:    dueTodayRes.count   ?? 0,
      collected:    collectedToday,
      new_loans:    newLoansTodayRes.count ?? 0,
      upcoming:     upcomingRes.count   ?? 0,
    },
    risk: {
      total_active:  totalActive,
      overdue_count: overdueCount,
      risk_pct:      Math.round(riskPct * 10) / 10,
      risk_level:    riskLevel,
    },
    profit: {
      weekly:  interestWeekly,
      monthly: interestMonthly,
      yearly:  interestYearly,
    },
    overview: {
      total_customers: totalCustomersRes.count ?? 0,
      active_loans:    activeCount,
      overdue_loans:   overdueCount,
      overdue_outstanding: overdueOutstanding,
    },
    chart,
    overdue_list: overdueList,
  })
})
