// GET  /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId/messages
// POST /api/v1/entities/:entityId/ziload/:subscriptionId/bookings/:bookingId/messages
// Realtime chat between shipper and transporter — zld_messages has Supabase Realtime enabled
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { SendMessageSchema } from '@/ziload/validators'

async function getBookingParties(bookingId: string) {
  return db.from('zld_bookings')
    .select('id,status,shipper_entity_id,transporter_entity_id')
    .eq('id', bookingId).single()
}

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: booking } = await getBookingParties(bookingId)
  if (!booking) return notFound('Booking')

  const isParty = booking.shipper_entity_id === entityId || booking.transporter_entity_id === entityId
  if (!isParty) return conflict('You are not a party to this booking')

  const { page, limit, offset } = parsePagination(req.url)

  const { data: messages, count, error } = await db.from('zld_messages')
    .select('id,body,attachment_url,sender_entity_id,sent_at', { count: 'exact' })
    .eq('booking_id', bookingId)
    .order('sent_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load messages', error)

  return ok({ messages: messages ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, bookingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: booking } = await getBookingParties(bookingId)
  if (!booking) return notFound('Booking')

  const isParty = booking.shipper_entity_id === entityId || booking.transporter_entity_id === entityId
  if (!isParty) return conflict('You are not a party to this booking')

  if (['CLOSED','CANCELLED'].includes(booking.status))
    return conflict(`Cannot send messages — booking is ${booking.status}`)

  const parsed = SendMessageSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: message, error } = await db.from('zld_messages').insert({
    booking_id:     bookingId,
    sender_entity_id: entityId,
    body:           parsed.data.body,
    attachment_url: parsed.data.attachment_url ?? null,
    sent_at:        new Date().toISOString(),
  }).select().single()

  if (error || !message) return serverError('Failed to send message', error)
  return created(message)
})
