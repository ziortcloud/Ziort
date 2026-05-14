// GET    /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId
// PATCH  /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId
// DELETE /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId (cancel)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateLoadSchema } from '@/ziload/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: load, error } = await db.from('zld_loads')
    .select(`
      *,
      zld_profiles!zld_loads_entity_id_fkey ( company_name, city, state, avg_rating, verified )
    `)
    .eq('id', loadId).single()
  if (error || !load) return notFound('Load')

  // Bids (only visible to the load owner)
  const isOwner = load.entity_id === entityId
  const bids = isOwner
    ? await db.from('zld_bids').select(`
        id, amount_paise, note, status, expires_at, created_at,
        zld_profiles!zld_bids_bidder_entity_id_fkey ( company_name, city, avg_rating ),
        zld_trucks ( vehicle_type, capacity_tons, reg_number, current_city )
      `).eq('load_id', loadId).order('amount_paise', { ascending: true })
    : { data: null }

  // Own bid if transporter is viewing
  const ownBid = !isOwner
    ? await db.from('zld_bids').select('id,amount_paise,status,note,created_at')
        .eq('load_id', loadId).eq('bidder_entity_id', entityId).maybeSingle()
    : { data: null }

  return ok({ ...load, bids: bids.data ?? [], own_bid: ownBid.data ?? null })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: load } = await db.from('zld_loads')
    .select('id,status,entity_id').eq('id', loadId).single()
  if (!load) return notFound('Load')
  if (load.entity_id !== entityId) return conflict('Cannot modify another entity\'s load')
  if (!['OPEN'].includes(load.status)) return conflict(`Cannot modify load in status ${load.status}`)

  const parsed = UpdateLoadSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zld_loads')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', loadId).select().single()

  if (error || !updated) return serverError('Failed to update load', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zld_loads', record_id: loadId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: load } = await db.from('zld_loads')
    .select('id,status,entity_id').eq('id', loadId).single()
  if (!load) return notFound('Load')
  if (load.entity_id !== entityId) return conflict('Cannot cancel another entity\'s load')
  if (['BOOKED','IN_TRANSIT','DELIVERED','CLOSED'].includes(load.status))
    return conflict(`Cannot cancel load in status ${load.status}`)

  const { error } = await db.from('zld_loads')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', loadId)

  if (error) return serverError('Failed to cancel load', error)

  // Expire all pending bids
  await db.from('zld_bids')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
    .eq('load_id', loadId).eq('status', 'PENDING')

  await writeAudit({ action: 'UPDATE', table_name: 'zld_loads', record_id: loadId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED' }, ...extractRequestMeta(req) })

  return ok({ cancelled: true, id: loadId })
})
