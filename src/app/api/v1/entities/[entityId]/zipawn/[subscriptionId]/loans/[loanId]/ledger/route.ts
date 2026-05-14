// GET /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId/ledger
// Double-entry transaction ledger for a loan — full audit trail.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: loan } = await db.from('zpn_loans')
    .select('id,zi_code,ref_code,sanctioned_paise,outstanding_paise,status')
    .eq('id', loanId).eq('entity_id', entityId).single()
  if (!loan) return notFound('Loan')

  const { page, limit, offset } = parsePagination(req.url)

  const { data: entries, count, error } = await db.from('zpn_ledger')
    .select('*', { count: 'exact' })
    .eq('loan_id', loanId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load ledger', error)

  // Interest accrual trail
  const { data: accruals } = await db.from('zpn_interest_accruals')
    .select('from_date,to_date,days,interest_paise,interest_rate_pm,is_paid,paid_on')
    .eq('loan_id', loanId)
    .order('from_date', { ascending: false })
    .limit(20)

  return ok({
    loan_summary: {
      zi_code:           loan.zi_code,
      ref_code:          loan.ref_code,
      sanctioned_paise:  loan.sanctioned_paise,
      outstanding_paise: loan.outstanding_paise,
      status:            loan.status,
    },
    ledger:   entries ?? [],
    accruals: accruals ?? [],
    meta:     { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
})
