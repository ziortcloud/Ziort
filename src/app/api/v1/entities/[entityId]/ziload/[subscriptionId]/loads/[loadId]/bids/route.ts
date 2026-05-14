// GET  /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId/bids
// POST /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId/bids
// GET  — shipper sees all bids; transporter sees only own bid
// POST — transporter places a bid on the load
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { PlaceBidSchema } from '@/ziload/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: load } = await db.from('zld_loads')
    .select('id,entity_id,status').eq('id', loadId).single()
  if (!load) return notFound('Load')

  const isOwner = load.entity_id === entityId

  const selectFields = `
    id, amount_paise, note, status, expires_at, created_at,
    ${isOwner ? `zld_profiles!zld_bids_bidder_entity_id_fkey ( company_name, city, avg_rating, verified ),` : ''}
    zld_trucks ( vehicle_type, capacity_tons, reg_number, current_city )
  `
  let bidsQuery = db.from('zld_bids')
    .select(selectFields)
    .eq('load_id', loadId)
    .order('amount_paise', { ascending: true })
  if (!isOwner) bidsQuery = bidsQuery.eq('bidder_entity_id', entityId)

  const { data: bids, error } = await bidsQuery

  if (error) return serverError('Failed to load bids', error)
  return ok(bids ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zld_profiles')
    .select('id,role').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Complete your ZiLoad profile before bidding')
  if (profile.role === 'shipper') return conflict('Shippers cannot place bids')

  const { data: load } = await db.from('zld_loads')
    .select('id,status,entity_id,expires_at').eq('id', loadId).single()
  if (!load) return notFound('Load')
  if (load.entity_id === entityId) return conflict('Cannot bid on your own load')
  if (load.status !== 'OPEN') return conflict(`Load is ${load.status} — bidding closed`)
  if (load.expires_at && new Date(load.expires_at) < new Date()) return conflict('Load has expired')

  // One bid per transporter per load
  const { data: existing } = await db.from('zld_bids')
    .select('id,status').eq('load_id', loadId).eq('bidder_entity_id', entityId).maybeSingle()
  if (existing && existing.status === 'PENDING') return conflict('You already have a pending bid — withdraw it first to re-bid')

  const parsed = PlaceBidSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Verify truck if provided
  if (parsed.data.truck_id) {
    const { data: truck } = await db.from('zld_trucks')
      .select('id,status').eq('id', parsed.data.truck_id).eq('entity_id', entityId).single()
    if (!truck) return notFound('Truck posting')
    if (truck.status !== 'AVAILABLE') return conflict('Truck is not available')
  }

  const { data: bid, error } = await db.from('zld_bids').insert({
    load_id:          loadId,
    bidder_entity_id: entityId,
    truck_id:         parsed.data.truck_id ?? null,
    amount_paise:     parsed.data.amount_paise,
    note:             parsed.data.note ?? null,
    expires_at:       new Date(Date.now() + 48 * 3600_000).toISOString(),
    created_by:       session.individual.id,
  }).select().single()

  if (error || !bid) return serverError('Failed to place bid', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_bids', record_id: bid.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { load_id: loadId, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(bid)
})
