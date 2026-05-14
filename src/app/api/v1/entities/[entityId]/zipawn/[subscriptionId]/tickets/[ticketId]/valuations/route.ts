// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/valuations
// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/valuations
// Appraise an item — API computes net value & max loan using LTV engine
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddValuationSchema } from '@/zipawn/validators'
import { getLtvPct } from '@/zipawn/services/ltv'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('id').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')

  const { data: valuations, error } = await db.from('zpn_item_valuations')
    .select(`*, zpn_items ( item_code, category, description, purity )`)
    .eq('ticket_id', ticketId)
    .order('appraised_at', { ascending: false })

  if (error) return serverError('Failed to load valuations', error)
  return ok(valuations ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('id,status,scheme_id').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')
  if (ticket.status === 'disbursed') return conflict('Ticket already disbursed')
  if (ticket.status === 'cancelled') return conflict('Ticket is cancelled')

  const parsed = AddValuationSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { item_id, gross_value_paise, deduction_pct, metal_price_per_gram_paise, valuation_notes } = parsed.data

  // Verify item belongs to this ticket
  const { data: item } = await db.from('zpn_items')
    .select('id,category,purity').eq('id', item_id).eq('ticket_id', ticketId).single()
  if (!item) return notFound('Item')

  // Get scheme for LTV rates (use entity defaults if no scheme)
  let ltvRates = { ltv_gold_916: 75, ltv_gold_999: 80, ltv_silver: 60, ltv_other: 50 }
  if (ticket.scheme_id) {
    const { data: scheme } = await db.from('zpn_schemes')
      .select('ltv_gold_916,ltv_gold_999,ltv_silver,ltv_other').eq('id', ticket.scheme_id).single()
    if (scheme) ltvRates = scheme
  }

  const ltv_pct        = getLtvPct(item.category, item.purity, ltvRates)
  const net_value      = Math.round(gross_value_paise * (1 - deduction_pct / 100))
  const max_loan_paise = Math.floor(net_value * ltv_pct / 100)

  // Mark previous valuation for this item as not latest
  await db.from('zpn_item_valuations')
    .update({ is_latest: false }).eq('item_id', item_id).eq('is_latest', true)

  const { data: valuation, error } = await db.from('zpn_item_valuations').insert({
    item_id,
    ticket_id:                 ticketId,
    entity_id:                 entityId,
    metal_price_per_gram_paise: metal_price_per_gram_paise ?? null,
    gross_value_paise,
    deduction_pct,
    net_value_paise:           net_value,
    ltv_pct,
    max_loan_paise,
    valuation_notes:           valuation_notes ?? null,
    appraised_by:              session.individual.id,
    is_latest:                 true,
  }).select().single()

  if (error || !valuation) return serverError('Failed to save valuation', error)

  // Recalculate ticket totals from all latest valuations
  const { data: latest } = await db.from('zpn_item_valuations')
    .select('net_value_paise,max_loan_paise')
    .eq('ticket_id', ticketId).eq('is_latest', true)

  const totalAppraised = (latest ?? []).reduce((s, v) => s + (v.net_value_paise ?? 0), 0)
  const maxEligible    = (latest ?? []).reduce((s, v) => s + (v.max_loan_paise ?? 0), 0)

  await db.from('zpn_tickets').update({
    total_appraised_paise: totalAppraised,
    max_eligible_paise:    maxEligible,
    updated_at:            new Date().toISOString(),
  }).eq('id', ticketId)

  await writeAudit({ action: 'CREATE', table_name: 'zpn_item_valuations', record_id: valuation.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { item_id, gross_value_paise, net_value_paise: net_value, ltv_pct, max_loan_paise },
    ...extractRequestMeta(req) })

  return created({ ...valuation, ticket_totals: { total_appraised_paise: totalAppraised, max_eligible_paise: maxEligible } })
})
