// GET /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/timeline
// Full status history of the trip — realtime subscriptions listen here
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,zi_code,status,origin,destination').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  const { data: timeline, error } = await db.from('zft_trip_timeline')
    .select('id,status,note,actor_role,lat,lng,recorded_at')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true })

  if (error) return serverError('Failed to load timeline', error)

  return ok({
    trip: { id: trip.id, zi_code: trip.zi_code, current_status: trip.status, origin: trip.origin, destination: trip.destination },
    timeline: timeline ?? [],
  })
})
