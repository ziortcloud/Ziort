// GET /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: booking, error } = await db.from('zld_bookings')
    .select(`
      *,
      zld_loads ( * ),
      shipper:zld_profiles!zld_bookings_shipper_entity_id_fkey ( company_name, city, state, gstin, avg_rating, verified ),
      transporter:zld_profiles!zld_bookings_transporter_entity_id_fkey ( company_name, city, state, gstin, avg_rating, verified ),
      zld_trucks ( * )
    `)
    .eq('id', bookingId).single()

  if (error || !booking) return notFound('Booking')

  // Access gate — only shipper or transporter can view
  const isParty = booking.shipper_entity_id === entityId || booking.transporter_entity_id === entityId
  if (!isParty) return conflict('You are not a party to this booking')

  // Status timeline + last 10 messages in parallel
  const [{ data: updates }, { data: messages }] = await Promise.all([
    db.from('zld_booking_updates')
      .select('id,status,note,actor_role,lat,lng,recorded_at')
      .eq('booking_id', bookingId)
      .order('recorded_at', { ascending: true }),
    db.from('zld_messages')
      .select('id,body,attachment_url,sender_entity_id,sent_at')
      .eq('booking_id', bookingId)
      .order('sent_at', { ascending: false })
      .limit(10),
  ])

  return ok({
    ...booking,
    delivery_otp_hash:     undefined, // never expose hash to clients
    updates:   updates   ?? [],
    messages:  (messages ?? []).reverse(),
  })
})
