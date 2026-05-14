// GET    /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId
// PATCH  /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId
// DELETE /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId (cancel)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const PatchTicketSchema = z.object({
  scheme_id:    z.string().uuid().optional(),
  branch_id:    z.string().uuid().optional(),
  status:       z.enum(['approved']).optional(),     // only manual approval allowed here
  cancel_reason: z.string().max(300).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket, error } = await db.from('zpn_tickets')
    .select(`
      *,
      zpn_customers ( id, full_name, mobile_last4, kyc_status, is_blacklisted ),
      zpn_schemes   ( id, scheme_code, scheme_name, interest_rate_pm, interest_basis, ltv_gold_916, ltv_gold_999, ltv_silver, ltv_other ),
      zi_branches   ( id, branch_name ),
      zpn_items ( id, item_seq, item_code, category, description, purity, weight_grams, status,
        zpn_item_valuations ( id, gross_value_paise, net_value_paise, ltv_pct, max_loan_paise, is_latest, appraised_at )
      )
    `)
    .eq('id', ticketId)
    .eq('entity_id', entityId)
    .single()

  if (error || !ticket) return notFound('Ticket')
  return ok(ticket)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zpn_tickets')
    .select('id,status').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Ticket')
  if (existing.status === 'disbursed') return conflict('Cannot modify a disbursed ticket')
  if (existing.status === 'cancelled') return conflict('Cannot modify a cancelled ticket')

  const parsed = PatchTicketSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.scheme_id) updates.scheme_id = parsed.data.scheme_id
  if (parsed.data.branch_id) updates.branch_id = parsed.data.branch_id
  if (parsed.data.status === 'approved' && existing.status === 'draft') {
    updates.status = 'approved'
  }

  const { data: ticket, error } = await db.from('zpn_tickets')
    .update(updates).eq('id', ticketId).select().single()

  if (error || !ticket) return serverError('Failed to update ticket', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_tickets', record_id: ticketId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: updates, ...extractRequestMeta(req) })

  return ok(ticket)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const cancel_reason = searchParams.get('reason') ?? 'Manual cancellation'

  const { data: existing } = await db.from('zpn_tickets')
    .select('id,status').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Ticket')
  if (existing.status === 'disbursed') return conflict('Cannot cancel a disbursed ticket')
  if (existing.status === 'cancelled') return conflict('Ticket is already cancelled')

  const { data: ticket, error } = await db.from('zpn_tickets')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason, updated_at: new Date().toISOString() })
    .eq('id', ticketId).select('id,zi_code,status').single()

  if (error || !ticket) return serverError('Failed to cancel ticket', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_tickets', record_id: ticketId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'cancelled', cancel_reason }, ...extractRequestMeta(req) })

  return ok({ cancelled: true, ...ticket })
})
