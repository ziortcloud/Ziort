// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId/renew
// Loan renewal — tenure extension, top-up, or refinance.
// Clears accrued interest and penalty as of renewal_date,
// resets maturity_date, optionally disbursed top-up amount.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RenewLoanSchema } from '@/zipawn/validators'
import { calcAccruedInterest, calcPenalty, overdueDays, maturityDate } from '@/zipawn/services/interest'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = RenewLoanSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: loan, error: loanErr } = await db.from('zpn_loans')
    .select('*').eq('id', loanId).eq('entity_id', entityId).single()
  if (loanErr || !loan) return notFound('Loan')
  if (['closed','cancelled','auctioned'].includes(loan.status))
    return conflict(`Loan is ${loan.status} — cannot renew`)

  const d = parsed.data

  // Calculate interest and penalty to clear at renewal
  const accrual = calcAccruedInterest({
    principal_paise:         loan.outstanding_paise,
    rate_pm:                 parseFloat(loan.interest_rate_pm),
    basis:                   loan.interest_basis,
    last_interest_paid_date: loan.last_interest_paid_date ?? null,
    opened_at:               loan.opened_at,
    as_of:                   d.renewal_date,
  })

  const od_days           = overdueDays(loan.maturity_date, loan.penalty_grace_days ?? 0, d.renewal_date)
  const penalty_paise     = calcPenalty(loan.outstanding_paise, parseFloat(loan.penalty_rate_pm), od_days, loan.interest_basis)
  const interest_to_clear = d.pay_interest_now ? accrual.interest_paise : 0
  const penalty_to_clear  = d.pay_interest_now ? penalty_paise : 0

  const new_rate       = d.new_interest_rate_pm ?? parseFloat(loan.interest_rate_pm)
  const new_sanctioned = loan.outstanding_paise + (d.topup_paise ?? 0)
  const new_maturity   = maturityDate(d.renewal_date, d.new_tenure_days)
  const net_topup      = (d.topup_paise ?? 0) - (d.renewal_fee_paise ?? 0)

  // Write renewal record
  const { data: renewal, error: rErr } = await db.from('zpn_renewals').insert({
    loan_id:               loanId,
    entity_id:             entityId,
    customer_id:           loan.customer_id,
    renewal_type:          d.renewal_type,
    renewal_date:          d.renewal_date,
    prev_sanctioned_paise: loan.sanctioned_paise,
    prev_outstanding_paise: loan.outstanding_paise,
    prev_interest_rate_pm: loan.interest_rate_pm,
    prev_tenure_days:      loan.tenure_days,
    prev_maturity_date:    loan.maturity_date,
    new_sanctioned_paise:  new_sanctioned,
    new_interest_rate_pm:  new_rate,
    new_tenure_days:       d.new_tenure_days,
    new_maturity_date:     new_maturity,
    interest_cleared_paise: interest_to_clear,
    penalty_cleared_paise:  penalty_to_clear,
    renewal_fee_paise:     d.renewal_fee_paise ?? 0,
    topup_disbursed_paise: d.topup_paise ?? 0,
    net_disbursed_paise:   net_topup,
    remarks:               d.remarks ?? null,
    created_by:            session.individual.id,
  }).select().single()

  if (rErr || !renewal) return serverError('Failed to create renewal record', rErr)

  // Update loan with new terms
  const renewedAt = new Date().toISOString()
  await db.from('zpn_loans').update({
    sanctioned_paise:       new_sanctioned,
    outstanding_paise:      new_sanctioned,
    interest_rate_pm:       new_rate,
    tenure_days:            d.new_tenure_days,
    maturity_date:          new_maturity,
    status:                 'active',
    last_interest_paid_date: d.pay_interest_now ? d.renewal_date : loan.last_interest_paid_date,
    total_interest_paid_paise: loan.total_interest_paid_paise + interest_to_clear,
    total_penalty_paid_paise:  loan.total_penalty_paid_paise  + penalty_to_clear,
    updated_at:             renewedAt,
  }).eq('id', loanId)

  // Ledger entry — renewal
  await db.from('zpn_ledger').insert({
    loan_id:      loanId,
    entity_id:    entityId,
    entry_date:   d.renewal_date,
    entry_type:   'renewal',
    debit_paise:  d.topup_paise ?? 0,
    credit_paise: interest_to_clear + penalty_to_clear,
    balance_paise: new_sanctioned,
    ref_type:     'renewal',
    ref_id:       renewal.id,
    narration:    `${d.renewal_type} — new maturity ${new_maturity}`,
    created_by:   session.individual.id,
  })

  await writeAudit({ action: 'CREATE', table_name: 'zpn_renewals', record_id: renewal.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { renewal_type: d.renewal_type, new_maturity, new_sanctioned, new_rate },
    ...extractRequestMeta(req) })

  return ok({
    renewal,
    summary: {
      interest_cleared_paise: interest_to_clear,
      penalty_cleared_paise:  penalty_to_clear,
      topup_disbursed_paise:  d.topup_paise ?? 0,
      renewal_fee_paise:      d.renewal_fee_paise ?? 0,
      net_disbursed_paise:    net_topup,
      new_outstanding_paise:  new_sanctioned,
      new_maturity_date:      new_maturity,
    },
  })
})
