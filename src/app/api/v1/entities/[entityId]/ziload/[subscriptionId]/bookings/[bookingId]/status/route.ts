// POST /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId/status
// Advances booking lifecycle: CONFIRMED → LOADING → IN_TRANSIT → UNLOADING → DELIVERED → CLOSED
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateBookingStatusSchema } from '@/ziload/validators'

const VALID_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED:  ['LOADING', 'CANCELLED'],
  LOADING:    ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['UNLOADING', 'DELIVERED', 'CANCELLED'],
  UNLOADING:  ['DELIVERED', 'CANCELLED'],
  DELIVERED:  ['CLOSED'],
  CLOSED:     [],
  CANCELLED:  [],
}

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpdateBookingStatusSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: booking } = await db.from('zld_bookings')
    .select('id,status,shipper_entity_id,transporter_entity_id,truck_id,load_id')
    .eq('id', bookingId).single()
  if (!booking) return notFound('Booking')

  const isShipper     = booking.shipper_entity_id === entityId
  const isTransporter = booking.transporter_entity_id === entityId
  if (!isShipper && !isTransporter) return conflict('You are not a party to this booking')

  const { status: newStatus, note, lat, lng, actor_role, lr_url, pod_url } = parsed.data

  const allowed = VALID_TRANSITIONS[booking.status] ?? []
  if (!allowed.includes(newStatus)) {
    return conflict(`Cannot transition from ${booking.status} to ${newStatus}`)
  }

  // Build update payload
  const bookingUpdate: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (lr_url)  bookingUpdate.lr_url  = lr_url
  if (pod_url) bookingUpdate.pod_url = pod_url

  const { error } = await db.from('zld_bookings').update(bookingUpdate).eq('id', bookingId)
  if (error) return serverError('Failed to update booking status', error)

  // If delivered, release the truck
  if (newStatus === 'DELIVERED' && booking.truck_id) {
    await db.from('zld_trucks')
      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', booking.truck_id)
  }

  // If cancelled, release truck + reopen the load
  if (newStatus === 'CANCELLED') {
    if (booking.truck_id) {
      await db.from('zld_trucks')
        .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
        .eq('id', booking.truck_id)
    }
    await db.from('zld_loads')
      .update({ status: 'OPEN', updated_at: new Date().toISOString() })
      .eq('id', booking.load_id)
  }

  // Record timeline update
  await db.from('zld_booking_updates').insert({
    booking_id:  bookingId,
    entity_id:   entityId,
    status:      newStatus,
    note:        note ?? null,
    actor_role,
    lat:         lat  ?? null,
    lng:         lng  ?? null,
    recorded_at: new Date().toISOString(),
  })

  await writeAudit({ action: 'UPDATE', table_name: 'zld_bookings', record_id: bookingId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: newStatus }, ...extractRequestMeta(req) })

  return ok({ status: newStatus, booking_id: bookingId })
})
