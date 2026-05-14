// GET  /api/v1/entities/:entityId/ziload/:subscriptionId/trucks
// POST /api/v1/entities/:entityId/ziload/:subscriptionId/trucks
// GET — truck board (AVAILABLE trucks visible to all; own trucks with all statuses via ?mine=true)
// POST — transporter posts truck availability
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { PostTruckSchema } from '@/ziload/validators'
import { nextTruckCode } from '@/ziload/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const mine        = searchParams.get('mine') === 'true'
  const city        = searchParams.get('city')
  const vehicleType = searchParams.get('vehicle_type')
  const destPref    = searchParams.get('dest')

  let query = db.from('zld_trucks')
    .select(`
      id, zi_code, vehicle_type, capacity_tons, reg_number,
      current_city, available_from, available_until, dest_preference,
      rate_paise, rate_type, status, created_at,
      zld_profiles!zld_trucks_entity_id_fkey ( company_name, city, avg_rating, verified )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (mine) {
    query = query.eq('entity_id', entityId)
  } else {
    query = query.eq('status', 'AVAILABLE')
      .or(`available_until.is.null,available_until.gte.${new Date().toISOString().split('T')[0]}`)
  }

  if (city)        query = query.ilike('current_city', `%${city}%`)
  if (vehicleType) query = query.eq('vehicle_type', vehicleType)
  if (destPref)    query = query.ilike('dest_preference', `%${destPref}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load truck board', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zld_profiles')
    .select('id,role').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Complete your ZiLoad profile before posting trucks')
  if (profile.role === 'shipper') return conflict('Shippers cannot post trucks')

  const parsed = PostTruckSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Validate ZiFleet vehicle link if provided
  if (parsed.data.zft_vehicle_id) {
    const { data: v } = await db.from('zft_vehicles')
      .select('id,status,reg_number,vehicle_type,capacity_tons')
      .eq('id', parsed.data.zft_vehicle_id).eq('entity_id', entityId).single()
    if (!v) return conflict('ZiFleet vehicle not found or not owned by this entity')
  }

  const zi_code = await nextTruckCode()

  const { data: truck, error } = await db.from('zld_trucks').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !truck) return serverError('Failed to post truck', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_trucks', record_id: truck.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, vehicle_type: parsed.data.vehicle_type, current_city: parsed.data.current_city },
    ...extractRequestMeta(req) })

  return created(truck)
})
