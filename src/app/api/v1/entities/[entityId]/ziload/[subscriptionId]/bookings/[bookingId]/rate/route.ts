// POST /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId/rate
// Shipper rates transporter and vice-versa after delivery
// One rating per side per booking; DB trigger recalculates profile avg_rating
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { SubmitRatingSchema } from '@/ziload/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: booking } = await db.from('zld_bookings')
    .select('id,status,shipper_entity_id,transporter_entity_id')
    .eq('id', bookingId).single()
  if (!booking) return notFound('Booking')

  const isShipper     = booking.shipper_entity_id === entityId
  const isTransporter = booking.transporter_entity_id === entityId
  if (!isShipper && !isTransporter) return conflict('You are not a party to this booking')

  if (!['DELIVERED','CLOSED'].includes(booking.status))
    return conflict('Ratings can only be submitted after delivery')

  // Determine who is being rated
  const rated_entity_id = isShipper ? booking.transporter_entity_id : booking.shipper_entity_id
  const rater_role      = isShipper ? 'shipper' : 'transporter'

  // One rating per rater per booking
  const { data: existing } = await db.from('zld_ratings')
    .select('id').eq('booking_id', bookingId).eq('rater_entity_id', entityId).maybeSingle()
  if (existing) return conflict('You have already rated this booking')

  const parsed = SubmitRatingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: rating, error } = await db.from('zld_ratings').insert({
    booking_id:       bookingId,
    rater_entity_id:  entityId,
    rated_entity_id,
    rater_role,
    rating:           parsed.data.rating,
    review:           parsed.data.review ?? null,
    subscription_id:  subscriptionId,
  }).select().single()

  if (error || !rating) return serverError('Failed to submit rating', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_ratings', record_id: rating.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { booking_id: bookingId, rated_entity_id, rating: parsed.data.rating },
    ...extractRequestMeta(req) })

  return created(rating)
})
