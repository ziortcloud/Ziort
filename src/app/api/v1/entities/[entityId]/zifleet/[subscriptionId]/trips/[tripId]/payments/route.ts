// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/payments
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/payments
// Trigger fn_zft_on_payment_insert updates trip.received_paise + payment_status
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordTripPaymentSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,freight_paise,received_paise,payment_status').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  const { data: payments, error } = await db.from('zft_trip_payments')
    .select('*').eq('trip_id', tripId).order('received_at', { ascending: false })

  if (error) return serverError('Failed to load payments', error)

  return ok({
    payments:      payments ?? [],
    freight_paise: trip.freight_paise,
    received_paise: trip.received_paise,
    balance_paise: Math.max(0, (trip.freight_paise ?? 0) - (trip.received_paise ?? 0)),
    payment_status: trip.payment_status,
  })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,status,freight_paise,received_paise,payment_status').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')
  if (trip.status === 'CANCELLED') return conflict('Cannot record payment for a cancelled trip')
  if (trip.payment_status === 'RECEIVED') return conflict('Freight is already fully received')

  const parsed = RecordTripPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const balance = Math.max(0, (trip.freight_paise ?? 0) - (trip.received_paise ?? 0))
  if (parsed.data.amount_paise > balance + 1)   // allow tiny rounding
    return conflict(`Payment (₹${parsed.data.amount_paise / 100}) exceeds outstanding balance (₹${balance / 100})`)

  const { data: payment, error } = await db.from('zft_trip_payments').insert({
    trip_id:         tripId,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    amount_paise:    parsed.data.amount_paise,
    mode:            parsed.data.mode,
    reference:       parsed.data.reference ?? null,
    received_at:     parsed.data.received_at ?? new Date().toISOString(),
    notes:           parsed.data.notes ?? null,
    received_by:     session.individual.id,
  }).select().single()

  if (error || !payment) return serverError('Failed to record payment', error)

  // DB trigger fn_zft_on_payment_insert updates received_paise + payment_status

  await writeAudit({ action: 'CREATE', table_name: 'zft_trip_payments', record_id: payment.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { trip_id: tripId, amount_paise: parsed.data.amount_paise, mode: parsed.data.mode },
    ...extractRequestMeta(req) })

  return created(payment)
})
