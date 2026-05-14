// GET   /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId/bids/:bidId
// PATCH /api/v1/entities/:entityId/ziload/:subscriptionId/loads/:loadId/bids/:bidId
// PATCH actions:
//   accept   → load owner accepts bid → creates booking, rejects all other bids
//   reject   → load owner rejects this bid
//   withdraw → bidder withdraws own bid
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RespondBidSchema } from '@/ziload/validators'
import { nextBookingCode } from '@/ziload/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId, bidId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: bid, error } = await db.from('zld_bids')
    .select(`*, zld_trucks ( * )`)
    .eq('id', bidId).eq('load_id', loadId).single()
  if (error || !bid) return notFound('Bid')

  return ok(bid)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, loadId, bidId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') // accept | reject | withdraw

  const { data: bid } = await db.from('zld_bids')
    .select('*').eq('id', bidId).eq('load_id', loadId).single()
  if (!bid) return notFound('Bid')
  if (bid.status !== 'PENDING') return conflict(`Bid is already ${bid.status}`)

  const { data: load } = await db.from('zld_loads')
    .select('id,entity_id,status,subscription_id').eq('id', loadId).single()
  if (!load) return notFound('Load')

  // WITHDRAW — bidder pulls their own bid
  if (action === 'withdraw') {
    if (bid.bidder_entity_id !== entityId) return conflict('Cannot withdraw another entity\'s bid')
    await db.from('zld_bids')
      .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() }).eq('id', bidId)
    return ok({ withdrawn: true, bid_id: bidId })
  }

  // ACCEPT / REJECT — load owner only
  if (load.entity_id !== entityId) return conflict('Only the load owner can accept or reject bids')
  if (load.status !== 'OPEN') return conflict(`Load is ${load.status}`)

  const parsed = RespondBidSchema.safeParse({ action, ...await req.json() })
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.action === 'reject') {
    await db.from('zld_bids')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', bidId)
    return ok({ rejected: true, bid_id: bidId })
  }

  // ACCEPT — create booking, reject all other pending bids, mark load BOOKED
  const bookingCode = await nextBookingCode()

  // Generate delivery OTP
  const otp       = String(Math.floor(100000 + Math.random() * 900000))
  const otp_hash  = crypto.createHash('sha256').update(otp).digest('hex')
  const otp_exp   = new Date(Date.now() + 72 * 3600_000).toISOString()

  const { data: booking, error: bErr } = await db.from('zld_bookings').insert({
    zi_code:               bookingCode,
    load_id:               loadId,
    bid_id:                bidId,
    shipper_entity_id:     entityId,
    transporter_entity_id: bid.bidder_entity_id,
    truck_id:              bid.truck_id ?? null,
    freight_paise:         bid.amount_paise,
    delivery_otp_hash:     otp_hash,
    delivery_otp_expires_at: otp_exp,
    subscription_id:       subscriptionId,
    created_by:            session.individual.id,
  }).select().single()

  if (bErr || !booking) return serverError('Failed to create booking', bErr)

  // Mark load as BOOKED
  await db.from('zld_loads')
    .update({ status: 'BOOKED', updated_at: new Date().toISOString() }).eq('id', loadId)

  // Accept this bid
  await db.from('zld_bids')
    .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() }).eq('id', bidId)

  // Reject all other pending bids on this load
  await db.from('zld_bids')
    .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
    .eq('load_id', loadId).eq('status', 'PENDING').neq('id', bidId)

  // Book the truck if linked
  if (bid.truck_id) {
    await db.from('zld_trucks')
      .update({ status: 'BOOKED', updated_at: new Date().toISOString() }).eq('id', bid.truck_id)
  }

  // Initial booking update
  await db.from('zld_booking_updates').insert({
    booking_id:  booking.id,
    entity_id:   entityId,
    status:      'CONFIRMED',
    note:        'Booking confirmed — bid accepted',
    actor_role:  'SHIPPER',
    recorded_at: new Date().toISOString(),
  })

  await writeAudit({ action: 'CREATE', table_name: 'zld_bookings', record_id: booking.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: bookingCode, freight_paise: bid.amount_paise, load_id: loadId },
    ...extractRequestMeta(req) })

  return ok({ booking, delivery_otp: otp })   // OTP shown once at booking creation
})
