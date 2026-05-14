// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/fuel
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/fuel
// Trigger fn_zft_on_fuel_insert updates trip.fuel_cost_paise + vehicle.total_fuel_litres
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { LogFuelSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,fuel_cost_paise').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  const { data: fuel, error } = await db.from('zft_fuel_logs')
    .select('*').eq('trip_id', tripId).order('logged_at', { ascending: false })

  if (error) return serverError('Failed to load fuel logs', error)

  const total_litres = (fuel ?? []).reduce((s, f) => s + parseFloat(f.litres), 0)
  return ok({ fuel_logs: fuel ?? [], total_litres, total_cost_paise: trip.fuel_cost_paise })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,status,vehicle_id').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')
  if (['CLOSED','CANCELLED'].includes(trip.status)) return conflict(`Cannot log fuel — trip is ${trip.status}`)

  const body = await req.json()
  const parsed = LogFuelSchema.safeParse({
    ...body,
    trip_id:    tripId,
    vehicle_id: body.vehicle_id ?? trip.vehicle_id,
  })
  if (!parsed.success) return validationError(parsed.error)

  if (!parsed.data.vehicle_id) return conflict('vehicle_id is required — trip has no assigned vehicle')

  const { data: log, error } = await db.from('zft_fuel_logs').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    logged_by:       session.individual.id,
  }).select().single()

  if (error || !log) return serverError('Failed to log fuel', error)

  // DB trigger fn_zft_on_fuel_insert updates trip.fuel_cost_paise + vehicle counters

  await writeAudit({ action: 'CREATE', table_name: 'zft_fuel_logs', record_id: log.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { trip_id: tripId, litres: parsed.data.litres, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(log)
})
