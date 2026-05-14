// GET  /api/v1/entities/:entityId/ziload/:subscriptionId/loads
// POST /api/v1/entities/:entityId/ziload/:subscriptionId/loads
// GET  — load board (all OPEN loads visible to all ZiLoad participants)
// POST — shipper/agency posts a new load requirement
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { PostLoadSchema } from '@/ziload/validators'
import { nextLoadCode } from '@/ziload/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const mine         = searchParams.get('mine') === 'true'
  const status       = searchParams.get('status') ?? 'OPEN'
  const origin       = searchParams.get('origin')
  const dest         = searchParams.get('dest')
  const vehicleType  = searchParams.get('vehicle_type')
  const pickupFrom   = searchParams.get('pickup_from')
  const pickupTo     = searchParams.get('pickup_to')

  let query = db.from('zld_loads')
    .select(`
      id, zi_code, status, origin_city, dest_city, pickup_date, required_by_date,
      material_type, weight_tons, vehicle_type, budget_paise, payment_terms,
      bid_count, lowest_bid_paise, expires_at, created_at,
      zld_profiles!zld_loads_entity_id_fkey ( company_name, city, avg_rating, verified )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Own loads — any status. Board — OPEN only, not expired.
  if (mine) {
    query = query.eq('entity_id', entityId)
    if (status) query = query.eq('status', status)
  } else {
    query = query.eq('status', 'OPEN').gt('expires_at', new Date().toISOString())
  }

  if (origin)       query = query.ilike('origin_city', `%${origin}%`)
  if (dest)         query = query.ilike('dest_city', `%${dest}%`)
  if (vehicleType && vehicleType !== 'ANY') query = query.in('vehicle_type', [vehicleType, 'ANY'])
  if (pickupFrom)   query = query.gte('pickup_date', pickupFrom)
  if (pickupTo)     query = query.lte('pickup_date', pickupTo)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load board', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  // Verify entity has a ZiLoad profile and can post loads
  const { data: profile } = await db.from('zld_profiles')
    .select('id,role').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Complete your ZiLoad profile before posting loads')
  if (profile.role === 'transporter') return conflict('Transporters cannot post loads — post trucks instead')

  const parsed = PostLoadSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code    = await nextLoadCode()
  const expires_at = new Date(Date.now() + parsed.data.expires_hours * 3600_000).toISOString()
  const { expires_hours: _, ...loadData } = parsed.data

  const { data: load, error } = await db.from('zld_loads').insert({
    ...loadData,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    expires_at,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !load) return serverError('Failed to post load', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_loads', record_id: load.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, origin_city: parsed.data.origin_city, dest_city: parsed.data.dest_city, material_type: parsed.data.material_type },
    ...extractRequestMeta(req) })

  return created(load)
})
