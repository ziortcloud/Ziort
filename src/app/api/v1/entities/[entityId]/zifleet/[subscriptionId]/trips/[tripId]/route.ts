// GET   /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId
// PATCH /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateTripSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip, error } = await db.from('zft_trips')
    .select(`
      *,
      zft_vehicles ( id, zi_code, reg_number, vehicle_type, make, model ),
      zft_drivers  ( id, zi_code, full_name, mobile_last4, license_no )
    `)
    .eq('id', tripId).eq('entity_id', entityId).single()
  if (error || !trip) return notFound('Trip')

  const [expenses, fuel, payments, timeline, lastLocation] = await Promise.all([
    db.from('zft_expenses').select('id,category,amount_paise,notes,logged_at').eq('trip_id', tripId).order('logged_at', { ascending: false }),
    db.from('zft_fuel_logs').select('id,litres,amount_paise,odometer,station,logged_at').eq('trip_id', tripId).order('logged_at', { ascending: false }),
    db.from('zft_trip_payments').select('id,amount_paise,mode,reference,received_at').eq('trip_id', tripId).order('received_at', { ascending: false }),
    db.from('zft_trip_timeline').select('status,note,actor_role,lat,lng,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: true }),
    db.from('zft_locations').select('lat,lng,speed_kmh,recorded_at').eq('trip_id', tripId).order('recorded_at', { ascending: false }).limit(1),
  ])

  const net_profit = (trip.freight_paise ?? 0) - (trip.expense_paise ?? 0) - (trip.fuel_cost_paise ?? 0)
  const balance_due = Math.max(0, (trip.freight_paise ?? 0) - (trip.received_paise ?? 0))

  return ok({
    ...trip,
    expenses:     expenses.data ?? [],
    fuel_logs:    fuel.data ?? [],
    payments:     payments.data ?? [],
    timeline:     timeline.data ?? [],
    last_location: lastLocation.data?.[0] ?? null,
    financials: {
      freight_paise:   trip.freight_paise,
      received_paise:  trip.received_paise,
      expense_paise:   trip.expense_paise,
      fuel_cost_paise: trip.fuel_cost_paise,
      net_profit_paise: net_profit,
      balance_due_paise: balance_due,
    },
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zft_trips')
    .select('id,status').eq('id', tripId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Trip')
  if (['CLOSED','CANCELLED'].includes(existing.status)) return conflict(`Trip is ${existing.status}`)

  const parsed = UpdateTripSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: trip, error } = await db.from('zft_trips')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', tripId).select().single()

  if (error || !trip) return serverError('Failed to update trip', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zft_trips', record_id: tripId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(trip)
})
