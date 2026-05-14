// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/locations
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/locations
// Driver's phone streams GPS pings here — realtime enabled on zft_locations table
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { LocationPingSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const latest = searchParams.get('latest') === 'true'

  const { data: trip } = await db.from('zft_trips')
    .select('id,status').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  if (latest) {
    const { data: loc } = await db.from('zft_locations')
      .select('lat,lng,speed_kmh,heading_deg,battery_pct,recorded_at')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(1)
    return ok(loc?.[0] ?? null)
  }

  const { page, limit, offset } = parsePagination(req.url)
  const { data: locations, count, error } = await db.from('zft_locations')
    .select('lat,lng,speed_kmh,heading_deg,accuracy_m,battery_pct,recorded_at', { count: 'exact' })
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load locations', error)
  return ok({ locations: locations ?? [], total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,status').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')
  if (!['LOADING','WAITING','IN_TRANSIT','UNLOADING'].includes(trip.status))
    return conflict(`Cannot ping location for trip in status ${trip.status}`)

  const parsed = LocationPingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: loc, error } = await db.from('zft_locations').insert({
    trip_id:     tripId,
    entity_id:   entityId,
    lat:         parsed.data.lat,
    lng:         parsed.data.lng,
    speed_kmh:   parsed.data.speed_kmh ?? null,
    heading_deg: parsed.data.heading_deg ?? null,
    accuracy_m:  parsed.data.accuracy_m ?? null,
    battery_pct: parsed.data.battery_pct ?? null,
    recorded_at: parsed.data.recorded_at ?? new Date().toISOString(),
  }).select().single()

  if (error || !loc) return serverError('Failed to save location', error)
  return created(loc)
})
