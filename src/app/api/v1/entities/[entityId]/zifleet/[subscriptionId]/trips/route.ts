// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/trips
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateTripSchema } from '@/zifleet/validators'
import { nextTripCode } from '@/zifleet/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status          = searchParams.get('status')
  const paymentStatus   = searchParams.get('payment_status')
  const vehicleId       = searchParams.get('vehicle_id')
  const driverId        = searchParams.get('driver_id')
  const from            = searchParams.get('from')
  const to              = searchParams.get('to')
  const search          = searchParams.get('search') ?? ''

  let query = db.from('zft_trips')
    .select(`
      id, zi_code, status, payment_status, origin, destination,
      client_name, client_phone, cargo_type, weight_tons,
      freight_paise, received_paise, expense_paise, fuel_cost_paise,
      advance_paise, started_at, delivered_at, closed_at, created_at,
      tracking_token, lr_number,
      zft_vehicles ( id, zi_code, reg_number, vehicle_type ),
      zft_drivers  ( id, zi_code, full_name, mobile_last4 )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)        query = query.eq('status', status)
  if (paymentStatus) query = query.eq('payment_status', paymentStatus)
  if (vehicleId)     query = query.eq('vehicle_id', vehicleId)
  if (driverId)      query = query.eq('driver_id', driverId)
  if (from)          query = query.gte('created_at', from)
  if (to)            query = query.lte('created_at', to + 'T23:59:59Z')
  if (search)        query = query.or(`origin.ilike.%${search}%,destination.ilike.%${search}%,client_name.ilike.%${search}%,lr_number.ilike.%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load trips', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateTripSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const d = parsed.data

  // Verify vehicle availability
  if (d.vehicle_id) {
    const { data: v } = await db.from('zft_vehicles')
      .select('id,status').eq('id', d.vehicle_id).eq('entity_id', entityId).single()
    if (!v) return notFound('Vehicle')
    if (v.status === 'ON_TRIP') return conflict('Vehicle is already on a trip')
    if (v.status === 'MAINTENANCE') return conflict('Vehicle is in maintenance')
    if (v.status === 'OFF_ROAD') return conflict('Vehicle is off-road')
  }

  // Verify driver availability
  if (d.driver_id) {
    const { data: dr } = await db.from('zft_drivers')
      .select('id,status').eq('id', d.driver_id).eq('entity_id', entityId).single()
    if (!dr) return notFound('Driver')
    if (dr.status === 'ON_TRIP') return conflict('Driver is already on a trip')
    if (dr.status === 'INACTIVE') return conflict('Driver is inactive')
  }

  const zi_code = await nextTripCode()

  const { data: trip, error } = await db.from('zft_trips').insert({
    ...d,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    status:          'CREATED',
    payment_status:  'PENDING',
    created_by:      session.individual.id,
  }).select().single()

  if (error || !trip) return serverError('Failed to create trip', error)

  // Write initial timeline entry
  await db.from('zft_trip_timeline').insert({
    trip_id:     trip.id,
    entity_id:   entityId,
    status:      'CREATED',
    note:        `Trip created — ${d.origin} → ${d.destination}`,
    actor_role:  'OWNER',
    recorded_at: new Date().toISOString(),
  })

  await writeAudit({ action: 'CREATE', table_name: 'zft_trips', record_id: trip.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, origin: d.origin, destination: d.destination, freight_paise: d.freight_paise },
    ...extractRequestMeta(req) })

  return created(trip)
})
