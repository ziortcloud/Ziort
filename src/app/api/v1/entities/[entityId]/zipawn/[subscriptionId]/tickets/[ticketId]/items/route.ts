// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/items
// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets/:ticketId/items
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddItemSchema } from '@/zipawn/validators'
import { itemCode } from '@/zipawn/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('id').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')

  const { data: items, error } = await db.from('zpn_items')
    .select(`*, zpn_item_valuations ( * ) `)
    .eq('ticket_id', ticketId)
    .order('item_seq', { ascending: true })

  if (error) return serverError('Failed to load items', error)
  return ok(items ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, ticketId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ticket } = await db.from('zpn_tickets')
    .select('id,zi_code,status,item_count').eq('id', ticketId).eq('entity_id', entityId).single()
  if (!ticket) return notFound('Ticket')
  if (ticket.status === 'disbursed') return conflict('Cannot add items to a disbursed ticket')
  if (ticket.status === 'cancelled') return conflict('Ticket is cancelled')

  const parsed = AddItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const nextSeq = (ticket.item_count ?? 0) + 1
  const code    = itemCode(ticket.zi_code, nextSeq)  // PT26A01-I01

  const { data: item, error } = await db.from('zpn_items').insert({
    ...parsed.data,
    ticket_id:  ticketId,
    entity_id:  entityId,
    item_seq:   nextSeq,
    item_code:  code,
    created_by: session.individual.id,
  }).select().single()

  if (error || !item) return serverError('Failed to add item', error)

  // Trigger fn_zpn_on_item_insert handles item_count update on zpn_tickets

  await writeAudit({ action: 'CREATE', table_name: 'zpn_items', record_id: item.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { item_code: code, category: parsed.data.category, description: parsed.data.description },
    ...extractRequestMeta(req) })

  return created(item)
})
