// POST /…/orders/:orderId/pay  — record payment; OPEN → BILLED → PAID
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordOrderPaymentSchema } from '@/zifood/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, orderId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: order } = await db.from('zfd_orders')
    .select('id,entity_id,status,grand_total_paise,amount_paid_paise,table_id,zi_code')
    .eq('id', orderId).single()
  if (!order) return notFound('Order')
  if (order.entity_id !== entityId) return conflict('Access denied')
  if (order.status === 'CANCELLED') return conflict('Cannot record payment on a cancelled order')
  if (order.status === 'PAID')      return conflict('Order is already fully paid')

  const parsed = RecordOrderPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const total_now = parsed.data.payments.reduce((s, p) => s + p.amount_paise, 0)
  const new_paid  = (order.amount_paid_paise ?? 0) + total_now

  if (new_paid > order.grand_total_paise)
    return conflict(`Payment (₹${new_paid/100}) exceeds order total (₹${order.grand_total_paise/100})`)

  const now     = new Date().toISOString()
  const is_paid = new_paid >= order.grand_total_paise

  // Insert payment rows
  const paymentRows = parsed.data.payments.map(p => ({
    order_id:         orderId,
    entity_id:        entityId,
    payment_mode:     p.payment_mode,
    amount_paise:     p.amount_paise,
    reference_number: p.reference_number ?? null,
    paid_at:          now,
    created_by:       session.individual.id,
  }))
  const { error: payErr } = await db.from('zfd_order_payments').insert(paymentRows)
  if (payErr) return serverError('Failed to record payment', payErr)

  const { error: updateErr } = await db.from('zfd_orders').update({
    amount_paid_paise: new_paid,
    status:            is_paid ? 'PAID' : 'BILLED',
    billed_at:         order.status === 'OPEN' ? now : undefined,
    closed_at:         is_paid ? now : undefined,
    updated_at:        now,
  }).eq('id', orderId)
  if (updateErr) return serverError('Failed to update order', updateErr)

  // Release table on full payment
  if (is_paid && order.table_id) {
    await db.from('zfd_tables').update({ status: 'CLEANING' }).eq('id', order.table_id)
  }

  await writeAudit({ action: 'UPDATE', table_name: 'zfd_orders', record_id: orderId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: is_paid ? 'PAID' : 'BILLED', amount_paid_paise: new_paid },
    ...extractRequestMeta(req) })

  return ok({
    paid:              is_paid,
    amount_paid_paise: new_paid,
    amount_due_paise:  order.grand_total_paise - new_paid,
    payments:          paymentRows,
  })
})
