// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId/payments
// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId/payments
// Waterfall: penalty → interest → principal → overpayment (pre-calculated in TypeScript)
// DB trigger fn_zpn_on_payment_insert reads columns from inserted row to update loan totals
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { RecordPaymentSchema } from '@/zipawn/validators'
import { paymentCode } from '@/zipawn/services/codes'
import { calculateWaterfall } from '@/zipawn/services/waterfall'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)

  const { data: loan } = await db.from('zpn_loans')
    .select('id').eq('id', loanId).eq('entity_id', entityId).single()
  if (!loan) return notFound('Loan')

  const { data: payments, count, error } = await db.from('zpn_payments')
    .select('*', { count: 'exact' })
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load payments', error)
  return ok({ payments: payments ?? [], total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = RecordPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: loan, error: loanErr } = await db.from('zpn_loans')
    .select('*').eq('id', loanId).eq('entity_id', entityId).single()
  if (loanErr || !loan) return notFound('Loan')
  if (['closed','cancelled','auctioned'].includes(loan.status))
    return conflict(`Cannot record payment — loan is ${loan.status}`)

  const d = parsed.data

  // Pre-calculate waterfall allocation
  const wf = calculateWaterfall({
    payment_amount_paise:    d.payment_amount_paise,
    outstanding_paise:       loan.outstanding_paise,
    interest_rate_pm:        parseFloat(loan.interest_rate_pm),
    interest_basis:          loan.interest_basis,
    last_interest_paid_date: loan.last_interest_paid_date ?? null,
    opened_at:               loan.opened_at,
    maturity_date:           loan.maturity_date,
    penalty_rate_pm:         parseFloat(loan.penalty_rate_pm),
    penalty_grace_days:      loan.penalty_grace_days ?? 0,
    payment_date:            d.payment_date,
  })

  const seq      = (loan.payment_count ?? 0) + 1
  const pay_code = paymentCode(loan.zi_code, seq)

  const { data: payment, error: payErr } = await db.from('zpn_payments').insert({
    payment_seq:              seq,
    payment_code:             pay_code,
    loan_id:                  loanId,
    entity_id:                entityId,
    subscription_id:          subscriptionId,
    customer_id:              loan.customer_id,
    payment_date:             d.payment_date,
    payment_amount_paise:     d.payment_amount_paise,
    penalty_portion_paise:    wf.penalty_portion_paise,
    interest_portion_paise:   wf.interest_portion_paise,
    principal_portion_paise:  wf.principal_portion_paise,
    overpayment_paise:        wf.overpayment_paise,
    interest_from_date:       wf.interest_from_date,
    interest_to_date:         wf.interest_to_date,
    interest_days:            wf.interest_days,
    payment_mode:             d.payment_mode,
    cheque_number:            d.cheque_number ?? null,
    transaction_ref:          d.transaction_ref ?? null,
    receipt_url:              d.receipt_url ?? null,
    outstanding_before_paise: wf.outstanding_before_paise,
    outstanding_after_paise:  wf.outstanding_after_paise,
    received_by:              session.individual.id,
  }).select().single()

  if (payErr || !payment) return serverError('Failed to record payment', payErr)

  // DB trigger fn_zpn_on_payment_insert has updated loan totals + auto-closed if outstanding = 0

  // Write interest accrual record if interest was paid
  if (wf.interest_portion_paise > 0) {
    await db.from('zpn_interest_accruals').insert({
      loan_id:             loanId,
      payment_id:          payment.id,
      entity_id:           entityId,
      from_date:           wf.interest_from_date,
      to_date:             wf.interest_to_date,
      days:                wf.interest_days,
      principal_base_paise: wf.outstanding_before_paise,
      interest_rate_pm:    loan.interest_rate_pm,
      interest_basis:      loan.interest_basis,
      interest_paise:      wf.interest_accrued_paise,
      is_paid:             true,
      paid_on:             d.payment_date,
    })
  }

  // Write ledger entry
  await db.from('zpn_ledger').insert({
    loan_id:      loanId,
    entity_id:    entityId,
    entry_date:   d.payment_date,
    entry_type:   'payment',
    debit_paise:  0,
    credit_paise: d.payment_amount_paise,
    balance_paise: wf.outstanding_after_paise,
    ref_type:     'payment',
    ref_id:       payment.id,
    narration:    `Payment via ${d.payment_mode}${d.transaction_ref ? ' — ' + d.transaction_ref : ''}`,
    created_by:   session.individual.id,
  })

  await writeAudit({ action: 'CREATE', table_name: 'zpn_payments', record_id: payment.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { payment_code: pay_code, payment_amount_paise: d.payment_amount_paise,
      penalty_portion_paise: wf.penalty_portion_paise, interest_portion_paise: wf.interest_portion_paise,
      principal_portion_paise: wf.principal_portion_paise, outstanding_after_paise: wf.outstanding_after_paise },
    ...extractRequestMeta(req) })

  return created({
    payment,
    waterfall: {
      penalty_portion_paise:   wf.penalty_portion_paise,
      interest_portion_paise:  wf.interest_portion_paise,
      principal_portion_paise: wf.principal_portion_paise,
      overpayment_paise:       wf.overpayment_paise,
    },
    loan_after: {
      outstanding_paise: wf.outstanding_after_paise,
      is_closed:         wf.outstanding_after_paise <= 0,
    },
  })
})
