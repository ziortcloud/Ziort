// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/loans/:loanId/close
// Loan closure — full payment, settlement, auction, or waiver.
// Calculates interest + penalty at closure date, writes zpn_closures record,
// updates loan status, optionally releases all pledged items.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CloseLoanSchema } from '@/zipawn/validators'
import { calcAccruedInterest, calcPenalty, overdueDays } from '@/zipawn/services/interest'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loanId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CloseLoanSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: loan, error: loanErr } = await db.from('zpn_loans')
    .select('*').eq('id', loanId).eq('entity_id', entityId).single()
  if (loanErr || !loan) return notFound('Loan')
  if (['closed','cancelled','auctioned'].includes(loan.status))
    return conflict(`Loan is already ${loan.status}`)

  const d = parsed.data

  // Compute interest and penalty accrued up to closure date
  const accrual = calcAccruedInterest({
    principal_paise:         loan.outstanding_paise,
    rate_pm:                 parseFloat(loan.interest_rate_pm),
    basis:                   loan.interest_basis,
    last_interest_paid_date: loan.last_interest_paid_date ?? null,
    opened_at:               loan.opened_at,
    as_of:                   d.closure_date,
  })

  const od_days        = overdueDays(loan.maturity_date, loan.penalty_grace_days ?? 0, d.closure_date)
  const penalty_paise  = calcPenalty(loan.outstanding_paise, parseFloat(loan.penalty_rate_pm), od_days, loan.interest_basis)
  const total_due      = loan.outstanding_paise + accrual.interest_paise + penalty_paise

  // Rebate calculation (early closure)
  let rebate_paise = 0
  if (loan.scheme_id && d.closure_type === 'full_payment') {
    const { data: scheme } = await db.from('zpn_schemes')
      .select('rebate_enabled,rebate_within_days,rebate_type,rebate_value').eq('id', loan.scheme_id).single()
    if (scheme?.rebate_enabled && scheme.rebate_within_days) {
      const days_remaining = Math.ceil(
        (new Date(loan.maturity_date).getTime() - new Date(d.closure_date).getTime()) / 86400000
      )
      if (days_remaining >= scheme.rebate_within_days) {
        if (scheme.rebate_type === 'fixed') {
          rebate_paise = Math.round((scheme.rebate_value ?? 0) * 100)
        } else {
          rebate_paise = Math.round(accrual.interest_paise * (scheme.rebate_value ?? 0) / 100)
        }
      }
    }
  }

  const final_settlement = Math.min(d.settlement_paise > 0 ? d.settlement_paise : total_due, total_due)
  const new_status = d.closure_type === 'auction' ? 'auctioned' : 'closed'
  const close_reason_map = { full_payment: 'full_payment', settlement: 'settlement', auction: 'auction', waiver: 'waiver' } as const

  // Write closure record
  const { data: closure, error: cErr } = await db.from('zpn_closures').insert({
    loan_id:               loanId,
    entity_id:             entityId,
    customer_id:           loan.customer_id,
    closure_date:          d.closure_date,
    closure_type:          d.closure_type,
    outstanding_at_closure: loan.outstanding_paise,
    interest_at_closure:   accrual.interest_paise,
    penalty_at_closure:    penalty_paise,
    total_due_paise:       total_due,
    settlement_paise:      final_settlement,
    rebate_paise,
    items_released:        d.release_items,
    released_at:           d.release_items ? new Date().toISOString() : null,
    released_by:           d.release_items ? session.individual.id : null,
    closure_notes:         d.closure_notes ?? null,
    created_by:            session.individual.id,
  }).select().single()

  if (cErr || !closure) return serverError('Failed to create closure record', cErr)

  // Update loan status
  await db.from('zpn_loans').update({
    status:      new_status,
    closed_at:   new Date().toISOString(),
    close_reason: close_reason_map[d.closure_type],
    outstanding_paise: 0,
    updated_at:  new Date().toISOString(),
  }).eq('id', loanId)

  // Release pledged items if requested
  if (d.release_items) {
    const { data: ticketRow } = await db.from('zpn_loans').select('ticket_id').eq('id', loanId).single()
    if (ticketRow?.ticket_id) {
      await db.from('zpn_items')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('ticket_id', ticketRow.ticket_id)
        .eq('status', 'pledged')
    }
  }

  // Ledger entry — closure
  await db.from('zpn_ledger').insert({
    loan_id:      loanId,
    entity_id:    entityId,
    entry_date:   d.closure_date,
    entry_type:   'closure',
    debit_paise:  0,
    credit_paise: final_settlement,
    balance_paise: 0,
    ref_type:     'closure',
    ref_id:       closure.id,
    narration:    `Loan ${d.closure_type} — ${d.closure_notes ?? ''}`,
    created_by:   session.individual.id,
  })

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_loans', record_id: loanId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: new_status, closure_type: d.closure_type, settlement_paise: final_settlement },
    ...extractRequestMeta(req) })

  return ok({
    closure,
    summary: {
      outstanding_at_closure: loan.outstanding_paise,
      interest_paise:         accrual.interest_paise,
      penalty_paise,
      total_due_paise:        total_due,
      rebate_paise,
      settlement_paise:       final_settlement,
      items_released:         d.release_items,
    },
    loan_status: new_status,
  })
})
