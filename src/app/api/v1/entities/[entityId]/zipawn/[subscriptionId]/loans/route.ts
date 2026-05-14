// GET /api/v1/entities/:entityId/zipawn/:subscriptionId/loans
// Loans are created via POST /tickets/:ticketId/disburse — this endpoint is GET only.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { paginated, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const branchId   = searchParams.get('branch_id')
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')
  const overdue    = searchParams.get('overdue')

  let query = db.from('zpn_loans')
    .select(`
      id, zi_code, ref_code, status,
      sanctioned_paise, outstanding_paise, net_disbursed_paise,
      interest_rate_pm, interest_basis, tenure_days,
      opened_at, maturity_date, closed_at,
      total_interest_paid_paise, total_principal_paid_paise, total_penalty_paid_paise,
      payment_count, last_payment_at,
      zpn_customers ( id, full_name, mobile_last4, kyc_status ),
      zi_branches   ( id, branch_name ),
      zpn_schemes   ( id, scheme_code, scheme_name )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)     query = query.eq('status', status)
  if (customerId) query = query.eq('customer_id', customerId)
  if (branchId)   query = query.eq('branch_id', branchId)
  if (from)       query = query.gte('opened_at', from)
  if (to)         query = query.lte('opened_at', to + 'T23:59:59Z')
  if (overdue === 'true') query = query.in('status', ['overdue','npa'])
  if (overdue === 'false') query = query.in('status', ['active'])

  const { data, count, error } = await query
  if (error) return serverError('Failed to load loans', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})
