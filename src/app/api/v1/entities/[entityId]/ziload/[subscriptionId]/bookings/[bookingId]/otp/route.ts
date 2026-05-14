// POST /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId/otp
// Transporter submits delivery OTP supplied by the shipper to confirm delivery
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { VerifyOtpSchema } from '@/ziload/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: booking } = await db.from('zld_bookings')
    .select('id,status,transporter_entity_id,shipper_entity_id,delivery_otp_hash,delivery_otp_expires_at,truck_id,load_id')
    .eq('id', bookingId).single()
  if (!booking) return notFound('Booking')

  // Only the transporter confirms delivery via OTP
  if (booking.transporter_entity_id !== entityId)
    return conflict('Only the transporter can confirm delivery via OTP')

  if (!['IN_TRANSIT','UNLOADING'].includes(booking.status))
    return conflict(`Cannot verify OTP — booking status is ${booking.status}`)

  if (!booking.delivery_otp_hash) return conflict('No delivery OTP set for this booking')
  if (new Date(booking.delivery_otp_expires_at) < new Date())
    return conflict('Delivery OTP has expired — contact the shipper to reissue')

  const parsed = VerifyOtpSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const submitted_hash = crypto.createHash('sha256').update(parsed.data.otp).digest('hex')
  if (submitted_hash !== booking.delivery_otp_hash)
    return conflict('Invalid OTP — delivery not confirmed')

  // Mark booking DELIVERED, clear OTP, release truck
  const now = new Date().toISOString()
  const { error } = await db.from('zld_bookings').update({
    status:                  'DELIVERED',
    delivery_otp_hash:       null,
    delivery_otp_expires_at: null,
    updated_at:              now,
  }).eq('id', bookingId)

  if (error) return serverError('Failed to confirm delivery', error)

  // Release the truck
  if (booking.truck_id) {
    await db.from('zld_trucks')
      .update({ status: 'AVAILABLE', updated_at: now }).eq('id', booking.truck_id)
  }

  // Record delivery milestone
  await db.from('zld_booking_updates').insert({
    booking_id:  bookingId,
    entity_id:   entityId,
    status:      'DELIVERED',
    note:        'Delivery confirmed via OTP',
    actor_role:  'TRANSPORTER',
    recorded_at: now,
  })

  await writeAudit({ action: 'UPDATE', table_name: 'zld_bookings', record_id: bookingId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'DELIVERED', otp_verified: true }, ...extractRequestMeta(req) })

  return ok({ delivered: true, booking_id: bookingId })
})
