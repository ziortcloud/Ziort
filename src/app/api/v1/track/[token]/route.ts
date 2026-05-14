// GET /api/v1/track/:token
// Public shipment tracking — no authentication required.
// Returns trip status, route, latest GPS location, and timeline.
// Shared with consignee via QR code or SMS link.
import { db } from '@/ziorbitcore/db/client'
import { ok, notFound, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const { token } = await ctx.params

  const { data: trip, error } = await db.from('zft_trips')
    .select(`
      id, zi_code, status, payment_status,
      origin, destination, via_points,
      client_name, client_ref,
      cargo_type, weight_tons,
      freight_paise, lr_number,
      planned_start, started_at, delivered_at,
      zft_vehicles ( reg_number, vehicle_type, make, model ),
      zft_drivers  ( full_name, mobile_last4 )
    `)
    .eq('tracking_token', token)
    .single()

  if (error || !trip) return notFound('Tracking token')

  const [timeline, lastLocation] = await Promise.all([
    db.from('zft_trip_timeline')
      .select('status,note,actor_role,recorded_at')
      .eq('trip_id', trip.id)
      .order('recorded_at', { ascending: true }),
    db.from('zft_locations')
      .select('lat,lng,speed_kmh,recorded_at')
      .eq('trip_id', trip.id)
      .order('recorded_at', { ascending: false })
      .limit(1),
  ])

  return ok({
    trip: {
      zi_code:        trip.zi_code,
      status:         trip.status,
      origin:         trip.origin,
      destination:    trip.destination,
      via_points:     trip.via_points ?? [],
      client_ref:     trip.client_ref,
      cargo_type:     trip.cargo_type,
      weight_tons:    trip.weight_tons,
      lr_number:      trip.lr_number,
      planned_start:  trip.planned_start,
      started_at:     trip.started_at,
      delivered_at:   trip.delivered_at,
    },
    vehicle:       trip.zft_vehicles,
    driver:        trip.zft_drivers ? { full_name: (trip.zft_drivers as any).full_name } : null,
    last_location: lastLocation.data?.[0] ?? null,
    timeline:      timeline.data ?? [],
  })
})
