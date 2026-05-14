// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/status
// Advance trip through its lifecycle — triggers update vehicle & driver status
// Valid transitions:
//   CREATED → LOADING → WAITING → IN_TRANSIT → UNLOADING → DELIVERED → CLOSED
//   Any (except CLOSED) → CANCELLED
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateTripStatusSchema } from '@/zifleet/validators'

const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED:    ['LOADING','IN_TRANSIT','CANCELLED'],
  LOADING:    ['WAITING','IN_TRANSIT','CANCELLED'],
  WAITING:    ['LOADING','IN_TRANSIT','CANCELLED'],
  IN_TRANSIT: ['UNLOADING','DELIVERED','CANCELLED'],
  UNLOADING:  ['DELIVERED','CANCELLED'],
  DELIVERED:  ['CLOSED'],
  CLOSED:     [],
  CANCELLED:  [],
}

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpdateTripStatusSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: trip } = await db.from('zft_trips')
    .select('id,zi_code,status,vehicle_id,driver_id,start_odo').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  const allowed = VALID_TRANSITIONS[trip.status] ?? []
  if (!allowed.includes(parsed.data.status))
    return conflict(`Cannot transition from ${trip.status} to ${parsed.data.status}`)

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status:     parsed.data.status,
    updated_at: now,
  }

  if (parsed.data.status === 'IN_TRANSIT')  updates.started_at   = now
  if (parsed.data.status === 'DELIVERED')   updates.delivered_at = now
  if (parsed.data.status === 'CLOSED')      updates.closed_at    = now
  if (parsed.data.end_odo) updates.end_odo = parsed.data.end_odo

  const { data: updated, error } = await db.from('zft_trips')
    .update(updates).eq('id', tripId).select().single()

  if (error || !updated) return serverError('Failed to update trip status', error)

  // DB trigger fn_zft_on_trip_status_change handles vehicle/driver status + km tally

  // Write timeline entry
  await db.from('zft_trip_timeline').insert({
    trip_id:     tripId,
    entity_id:   entityId,
    status:      parsed.data.status,
    note:        parsed.data.note ?? null,
    actor_role:  parsed.data.actor_role,
    lat:         parsed.data.lat ?? null,
    lng:         parsed.data.lng ?? null,
    recorded_at: now,
  })

  await writeAudit({ action: 'UPDATE', table_name: 'zft_trips', record_id: tripId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: parsed.data.status, from_status: trip.status },
    ...extractRequestMeta(req) })

  return ok({
    trip_id:    tripId,
    zi_code:    trip.zi_code,
    old_status: trip.status,
    new_status: parsed.data.status,
    updated_at: now,
  })
})
