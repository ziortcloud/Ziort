// GET   /…/orders/:orderId  — full order with items, KOTs, payments
// PATCH /…/orders/:orderId  — cancel order  (?action=cancel)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CancelOrderSchema } from '@/zifood/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, orderId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const [orderResult, itemsResult, kotsResult, paymentsResult] = await Promise.all([
    db.from('zfd_orders').select('*, zfd_tables ( name, zi_code )').eq('id', orderId).single(),
    db.from('zfd_order_items').select('*').eq('order_id', orderId).order('sort_order'),
    db.from('zfd_kots').select('*').eq('order_id', orderId).order('created_at'),
    db.from('zfd_order_payments').select('*').eq('order_id', orderId).order('created_at'),
  ])

  if (orderResult.error || !orderResult.data) return notFound('Order')
  if (orderResult.data.entity_id !== entityId) return conflict('Access denied')

  return ok({
    ...orderResult.data,
    items:    itemsResult.data ?? [],
    kots:     kotsResult.data ?? [],
    payments: paymentsResult.data ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, orderId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: order } = await db.from('zfd_orders')
    .select('id,entity_id,status,table_id,amount_paid_paise').eq('id', orderId).single()
  if (!order) return notFound('Order')
  if (order.entity_id !== entityId) return conflict('Access denied')
  if (order.status === 'CANCELLED') return conflict('Order is already cancelled')
  if (order.status === 'PAID')      return conflict('Cannot cancel a paid order')
  if ((order.amount_paid_paise ?? 0) > 0)
    return conflict('Cannot cancel an order with recorded payments — refund first')

  const parsed = CancelOrderSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()

  const { data: updated, error } = await db.from('zfd_orders').update({
    status: 'CANCELLED', closed_at: now, updated_at: now,
    notes:  parsed.data.cancel_reason,
  }).eq('id', orderId).select().single()
  if (error || !updated) return serverError('Failed to cancel order', error)

  // Release table
  if (order.table_id) {
    await db.from('zfd_tables').update({ status: 'AVAILABLE' }).eq('id', order.table_id)
  }

  await writeAudit({ action: 'UPDATE', table_name: 'zfd_orders', record_id: orderId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED', cancel_reason: parsed.data.cancel_reason },
    ...extractRequestMeta(req) })

  return ok({ cancelled: true, order: updated })
})
