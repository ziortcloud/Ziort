// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/disburse
// Approve ticket + create loan account + write ledger entry (disbursal)
// No RPCs — all logic in TypeScript, triggers maintain running counters.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { DisburseTicketSchema } from '@/zipawn/validators'
import { nextLoanCode, loanRefCode } from '@/zipawn/services/codes'
import { calcProcessingFee } from '@/zipawn/services/ltv'
import { maturityDate } from '@/zipawn/services/interest'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('*').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')
  if (ticket.status === 'disbursed') return conflict('Ticket already disbursed')
  if (ticket.status === 'cancelled') return conflict('Ticket is cancelled')
  if ((ticket.item_count ?? 0) === 0) return conflict('Ticket has no pledged items')
  if ((ticket.total_appraised_paise ?? 0) === 0) return conflict('Items have not been appraised')

  const parsed = DisburseTicketSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const d = parsed.data

  // Single scheme query — fetch all needed fields at once
  let penalty_rate_pm    = 0
  let penalty_grace_days = 0
  let processing_fee_paise = 0

  if (ticket.scheme_id) {
    const { data: scheme } = await db.from('zpn_schemes')
      .select('min_loan_paise,max_loan_paise,penalty_rate_pm,penalty_grace_days,processing_fee_type,processing_fee_value,processing_fee_max_paise')
      .eq('id', ticket.scheme_id).single()

    if (scheme) {
      if (d.sanctioned_paise < scheme.min_loan_paise)
        return conflict(`Sanctioned amount below scheme minimum (₹${(scheme.min_loan_paise / 100).toFixed(0)})`)
      if (d.sanctioned_paise > scheme.max_loan_paise)
        return conflict(`Sanctioned amount exceeds scheme maximum (₹${(scheme.max_loan_paise / 100).toFixed(0)})`)

      processing_fee_paise = calcProcessingFee({
        sanctioned_paise: d.sanctioned_paise,
        fee_type:         scheme.processing_fee_type as 'percentage' | 'fixed',
        fee_value:        scheme.processing_fee_value,
        fee_max_paise:    scheme.processing_fee_max_paise ?? null,
      })
      penalty_rate_pm    = scheme.penalty_rate_pm
      penalty_grace_days = scheme.penalty_grace_days
    }
  }

  // Cannot sanction more than max eligible from appraisals
  if (ticket.max_eligible_paise && d.sanctioned_paise > ticket.max_eligible_paise)
    return conflict(`Sanctioned (₹${(d.sanctioned_paise / 100).toFixed(0)}) exceeds max eligible (₹${(ticket.max_eligible_paise / 100).toFixed(0)})`)

  const net_disbursed = d.sanctioned_paise - processing_fee_paise
  const openedAt      = new Date().toISOString()
  const maturity      = maturityDate(openedAt, d.tenure_days)

  const [[entityRow, subRow], loanCode] = await Promise.all([
    Promise.all([
      db.from('zi_entities').select('zi_code').eq('id', entityId).single(),
      db.from('zi_subscriptions').select('zi_code').eq('id', subscriptionId).single(),
    ]),
    nextLoanCode(),
  ])
  const ref_code = loanRefCode(entityRow.data?.zi_code ?? '', subRow.data?.zi_code ?? '', loanCode)

  const { data: loan, error: loanErr } = await db.from('zpn_loans').insert({
    zi_code:                   loanCode,
    ref_code,
    entity_id:                 entityId,
    subscription_id:           subscriptionId,
    branch_id:                 ticket.branch_id,
    customer_id:               ticket.customer_id,
    ticket_id:                 ticketId,
    scheme_id:                 ticket.scheme_id ?? null,
    sanctioned_paise:          d.sanctioned_paise,
    outstanding_paise:         d.sanctioned_paise,
    interest_rate_pm:          d.interest_rate_pm,
    interest_basis:            d.interest_basis,
    tenure_days:               d.tenure_days,
    opened_at:                 openedAt,
    maturity_date:             maturity,
    processing_fee_paise,
    net_disbursed_paise:       net_disbursed,
    penalty_rate_pm,
    penalty_grace_days,
    disbursement_mode:         d.disbursement_mode,
    bank_name:                 d.bank_name ?? null,
    account_last4:             d.account_last4 ?? null,
    upi_id:                    d.upi_id ?? null,
    cheque_number:             d.cheque_number ?? null,
    created_by:                session.individual.id,
  }).select().single()

  if (loanErr || !loan) return serverError('Failed to create loan', loanErr)

  // Link ticket → loan + mark disbursed
  await db.from('zpn_tickets').update({
    loan_id:               loan.id,
    status:                'disbursed',
    sanctioned_paise:      d.sanctioned_paise,
    interest_rate_pm:      d.interest_rate_pm,
    interest_basis:        d.interest_basis,
    tenure_days:           d.tenure_days,
    processing_fee_paise,
    disbursed_at:          openedAt,
    disbursement_mode:     d.disbursement_mode,
    bank_name:             d.bank_name ?? null,
    account_last4:         d.account_last4 ?? null,
    customer_signature_url: d.customer_signature_url ?? null,
    witness_name:          d.witness_name ?? null,
    updated_at:            openedAt,
  }).eq('id', ticketId)

  // Initial ledger entry — disbursement debit
  await db.from('zpn_ledger').insert({
    loan_id:       loan.id,
    entity_id:     entityId,
    entry_date:    openedAt.split('T')[0],
    entry_type:    'disbursement',
    debit_paise:   d.sanctioned_paise,
    credit_paise:  0,
    balance_paise: d.sanctioned_paise,
    ref_type:      'loan',
    ref_id:        loan.id,
    narration:     `Loan disbursed — ${d.disbursement_mode}`,
    created_by:    session.individual.id,
  })

  await writeAudit({ action: 'CREATE', table_name: 'zpn_loans', record_id: loan.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: loanCode, ref_code, sanctioned_paise: d.sanctioned_paise, maturity_date: maturity },
    ...extractRequestMeta(req) })

  return created({ loan, net_disbursed_paise: net_disbursed, processing_fee_paise, maturity_date: maturity })
})
