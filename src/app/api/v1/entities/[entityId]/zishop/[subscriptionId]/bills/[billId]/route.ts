// GET   /…/bills/:billId  — with items + payments
// PATCH /…/bills/:billId  — cancel only
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CancelBillSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, billId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const [billResult, itemsResult, paymentsResult] = await Promise.all([
    db.from('zsh_bills').select('*').eq('id', billId).single(),
    db.from('zsh_bill_items').select('*').eq('bill_id', billId).order('sort_order'),
    db.from('zsh_bill_payments').select('*').eq('bill_id', billId).order('created_at'),
  ])

  if (billResult.error || !billResult.data) return notFound('Bill')
  if (billResult.data.entity_id !== entityId) return conflict('Access denied')

  return ok({
    ...billResult.data,
    items:    itemsResult.data ?? [],
    payments: paymentsResult.data ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, billId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: bill } = await db.from('zsh_bills')
    .select('id,entity_id,status,customer_id,grand_total_paise,loyalty_points_earned,loyalty_points_used')
    .eq('id', billId).single()
  if (!bill) return notFound('Bill')
  if (bill.entity_id !== entityId) return conflict('Access denied')
  if (bill.status === 'CANCELLED') return conflict('Bill is already cancelled')

  const parsed = CancelBillSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()

  // Reverse stock deductions if bill was PAID
  if (bill.status === 'PAID') {
    const { data: items } = await db.from('zsh_bill_items')
      .select('product_id,qty,product_name').eq('bill_id', billId)

    for (const item of items ?? []) {
      if (!item.product_id) continue

      const { data: product } = await db.from('zsh_products')
        .select('track_stock').eq('id', item.product_id).maybeSingle()
      if (!product?.track_stock) continue

      const { data: stockRow } = await db.from('zsh_stock')
        .select('qty_on_hand').eq('product_id', item.product_id).maybeSingle()
      const qty_before = stockRow?.qty_on_hand ?? 0
      const qty_after  = qty_before + item.qty

      await db.from('zsh_stock').update({ qty_on_hand: qty_after, updated_at: now })
        .eq('product_id', item.product_id)

      await db.from('zsh_stock_movements').insert({
        entity_id:      entityId,
        product_id:     item.product_id,
        movement_type:  'RETURN_IN',
        qty_change:     item.qty,
        qty_before,
        qty_after,
        reference_id:   billId,
        reference_type: 'BILL',
        note:           `Bill ${billId} cancelled`,
        created_by:     session.individual.id,
      })
    }

    // Reverse loyalty points if customer linked
    if (bill.customer_id) {
      const { data: cust } = await db.from('zsh_customers')
        .select('loyalty_points,total_spent_paise,total_bills').eq('id', bill.customer_id).single()
      if (cust) {
        const pointsEarned = bill.loyalty_points_earned ?? 0
        const pointsUsed   = bill.loyalty_points_used ?? 0
        await db.from('zsh_customers').update({
          loyalty_points:    Math.max(0, cust.loyalty_points - pointsEarned + pointsUsed),
          total_spent_paise: Math.max(0, cust.total_spent_paise - bill.grand_total_paise),
          total_bills:       Math.max(0, cust.total_bills - 1),
          updated_at:        now,
        }).eq('id', bill.customer_id)
      }
    }
  }

  const { data: updated, error } = await db.from('zsh_bills').update({
    status:        'CANCELLED',
    cancelled_at:  now,
    cancel_reason: parsed.data.cancel_reason,
    updated_at:    now,
  }).eq('id', billId).select().single()

  if (error || !updated) return serverError('Failed to cancel bill', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_bills', record_id: billId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED', cancel_reason: parsed.data.cancel_reason },
    ...extractRequestMeta(req) })

  return ok({ cancelled: true, bill: updated })
})
