// GET    /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/items/:itemId
// PATCH  /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/items/:itemId
// DELETE /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/items/:itemId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateItemSchema } from '@/zipawn/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: item, error } = await db.from('zpn_items')
    .select(`*, zpn_item_valuations ( * )`)
    .eq('id', itemId).eq('ticket_id', ticketId).eq('entity_id', entityId).single()

  if (error || !item) return notFound('Item')
  return ok(item)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zpn_items')
    .select('id,status').eq('id', itemId).eq('ticket_id', ticketId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Item')
  if (existing.status !== 'pledged') return conflict(`Item is ${existing.status} — cannot modify`)

  // Check ticket is not yet disbursed
  const { data: ticket } = await db.from('zpn_tickets')
    .select('status').eq('id', ticketId).single()
  if (ticket?.status === 'disbursed') return conflict('Cannot modify items of a disbursed ticket')
  if (ticket?.status === 'cancelled') return conflict('Ticket is cancelled')

  const parsed = UpdateItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'released') updates.released_at  = new Date().toISOString()
  if (parsed.data.status === 'auctioned') updates.auctioned_at = new Date().toISOString()

  const { data: item, error } = await db.from('zpn_items')
    .update(updates).eq('id', itemId).select().single()

  if (error || !item) return serverError('Failed to update item', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_items', record_id: itemId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(item)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('status').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')
  if (ticket.status !== 'draft') return conflict('Items can only be removed from draft tickets')

  const { data: item } = await db.from('zpn_items')
    .select('id,item_seq').eq('id', itemId).eq('ticket_id', ticketId).single()
  if (!item) return notFound('Item')

  // Remove valuations first (FK constraint)
  await db.from('zpn_item_valuations').delete().eq('item_id', itemId)

  const { error } = await db.from('zpn_items').delete().eq('id', itemId)
  if (error) return serverError('Failed to remove item', error)

  // Recalculate ticket totals after removal (trigger handles item_count on INSERT; on DELETE we update manually)
  const { data: remaining } = await db.from('zpn_item_valuations')
    .select('net_value_paise,max_loan_paise')
    .eq('ticket_id', ticketId).eq('is_latest', true)

  const totalAppraised = (remaining ?? []).reduce((s, v) => s + (v.net_value_paise ?? 0), 0)
  const maxEligible    = (remaining ?? []).reduce((s, v) => s + (v.max_loan_paise ?? 0), 0)
  const itemCount      = await db.from('zpn_items').select('id', { count: 'exact', head: true }).eq('ticket_id', ticketId)

  await db.from('zpn_tickets').update({
    item_count:            itemCount.count ?? 0,
    total_appraised_paise: totalAppraised,
    max_eligible_paise:    maxEligible,
    updated_at:            new Date().toISOString(),
  }).eq('id', ticketId)

  await writeAudit({ action: 'DELETE', table_name: 'zpn_items', record_id: itemId,
    entity_id: entityId, individual_id: session.individual.id,
    ...extractRequestMeta(req) })

  return ok({ removed: true, item_id: itemId })
})
