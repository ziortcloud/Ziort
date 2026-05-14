// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId
// PATCH /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId
// Full loan detail with live accrual summary
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { calcAccruedInterest, calcPenalty, overdueDays } from '@/zipawn/services/interest'
import { z } from 'zod'

const PatchLoanSchema = z.object({
  status:            z.enum(['npa']).optional(),   // manual NPA declaration
  npa_declared_at:   z.string().datetime().optional(),
  auction_notice_at: z.string().datetime().optional(),
  auction_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: loan, error } = await db.from('zpn_loans')
    .select(`
      *,
      zpn_customers ( id, full_name, mobile_last4, city, state, kyc_status ),
      zi_branches   ( id, branch_name ),
      zpn_schemes   ( id, scheme_code, scheme_name ),
      zpn_tickets   ( id, zi_code, item_count, total_appraised_paise,
        zpn_items ( id, item_code, category, description, purity, weight_grams, status )
      )
    `)
    .eq('id', loanId)
    .eq('entity_id', entityId)
    .single()

  if (error || !loan) return notFound('Loan')

  // Live accrual — computed fresh, not stored
  const today = new Date().toISOString().split('T')[0]
  const accrual = calcAccruedInterest({
    principal_paise:         loan.outstanding_paise,
    rate_pm:                 parseFloat(loan.interest_rate_pm),
    basis:                   loan.interest_basis,
    last_interest_paid_date: loan.last_interest_paid_date ?? null,
    opened_at:               loan.opened_at,
    as_of:                   today,
  })
  const od_days = overdueDays(loan.maturity_date, loan.penalty_grace_days ?? 0, today)
  const penalty_accrued = calcPenalty(loan.outstanding_paise, parseFloat(loan.penalty_rate_pm), od_days, loan.interest_basis)

  const days_to_maturity = Math.ceil(
    (new Date(loan.maturity_date).getTime() - Date.now()) / 86400000
  )

  const { data: recentPayments } = await db.from('zpn_payments')
    .select('id,payment_code,payment_date,payment_amount_paise,payment_mode,outstanding_after_paise')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false })
    .limit(5)

  return ok({
    ...loan,
    live_summary: {
      interest_accrued_paise: accrual.interest_paise,
      interest_from_date:     accrual.from_date,
      interest_to_date:       accrual.to_date,
      interest_days:          accrual.days,
      penalty_accrued_paise:  penalty_accrued,
      overdue_days:           od_days,
      days_to_maturity,
      total_due_now_paise:    loan.outstanding_paise + accrual.interest_paise + penalty_accrued,
    },
    recent_payments: recentPayments ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: loan } = await db.from('zpn_loans')
    .select('id,status').eq('id', loanId).eq('entity_id', entityId).single()
  if (!loan) return notFound('Loan')
  if (['closed','cancelled','auctioned'].includes(loan.status))
    return conflict(`Loan is ${loan.status}`)

  const parsed = PatchLoanSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zpn_loans')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', loanId).select().single()

  if (error || !updated) return serverError('Failed to update loan', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_loans', record_id: loanId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(updated)
})
