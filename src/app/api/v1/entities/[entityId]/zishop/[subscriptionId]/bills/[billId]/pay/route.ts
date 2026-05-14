// POST /…/bills/:billId/pay  — record payment (split payment supported)
// When total payments cover grand_total → bill status → PAID; stock deducted; loyalty updated
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordBillPaymentSchema } from '@/zishop/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, billId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: bill } = await db.from('zsh_bills')
    .select('id,entity_id,status,grand_total_paise,amount_paid_paise,amount_due_paise,customer_id,loyalty_points_earned,loyalty_points_used,zi_code')
    .eq('id', billId).single()
  if (!bill) return notFound('Bill')
  if (bill.entity_id !== entityId) return conflict('Access denied')
  if (bill.status === 'CANCELLED') return conflict('Cannot record payment on a cancelled bill')
  if (bill.status === 'PAID')      return conflict('Bill is already fully paid')

  const parsed = RecordBillPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const total_now = parsed.data.payments.reduce((s, p) => s + p.amount_paise, 0)
  const new_paid  = bill.amount_paid_paise + total_now

  if (new_paid > bill.grand_total_paise)
    return conflict(`Payment total (₹${new_paid/100}) exceeds bill amount (₹${bill.grand_total_paise/100})`)

  const now = new Date().toISOString()

  // Insert all payment rows
  const paymentRows = parsed.data.payments.map(p => ({
    bill_id:          billId,
    entity_id:        entityId,
    payment_mode:     p.payment_mode,
    amount_paise:     p.amount_paise,
    reference_number: p.reference_number ?? null,
    paid_at:          now,
    created_by:       session.individual.id,
  }))
  const { error: payErr } = await db.from('zsh_bill_payments').insert(paymentRows)
  if (payErr) return serverError('Failed to record payment', payErr)

  const new_due = bill.grand_total_paise - new_paid
  const is_paid = new_due <= 0

  // Update bill totals + status
  const { error: billErr } = await db.from('zsh_bills').update({
    amount_paid_paise: new_paid,
    amount_due_paise:  new_due,
    status:            is_paid ? 'PAID' : 'DRAFT',
    updated_at:        now,
  }).eq('id', billId)
  if (billErr) return serverError('Failed to update bill', billErr)

  // On full payment: deduct stock + update customer loyalty
  if (is_paid) {
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
      const qty_after  = Math.max(0, qty_before - item.qty)

      await db.from('zsh_stock').update({ qty_on_hand: qty_after, updated_at: now })
        .eq('product_id', item.product_id)

      await db.from('zsh_stock_movements').insert({
        entity_id:      entityId,
        product_id:     item.product_id,
        movement_type:  'SALE_OUT',
        qty_change:     -item.qty,
        qty_before,
        qty_after,
        reference_id:   billId,
        reference_type: 'BILL',
        note:           `Bill ${bill.zi_code} payment`,
        created_by:     session.individual.id,
      })
    }

    // Update customer stats + loyalty
    if (bill.customer_id) {
      const pointsEarned = bill.loyalty_points_earned ?? 0
      const pointsUsed   = bill.loyalty_points_used ?? 0
      const { data: cust } = await db.from('zsh_customers')
        .select('total_spent_paise,total_bills,loyalty_points').eq('id', bill.customer_id).single()
      if (cust) {
        await db.from('zsh_customers').update({
          total_spent_paise: cust.total_spent_paise + bill.grand_total_paise,
          total_bills:       cust.total_bills + 1,
          loyalty_points:    cust.loyalty_points + pointsEarned - pointsUsed,
          updated_at:        now,
        }).eq('id', bill.customer_id)
      }
    }
  }

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_bills', record_id: billId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { amount_paid_paise: new_paid, status: is_paid ? 'PAID' : 'DRAFT', payment_count: parsed.data.payments.length },
    ...extractRequestMeta(req) })

  return ok({
    paid:              is_paid,
    amount_paid_paise: new_paid,
    amount_due_paise:  new_due,
    payments:          paymentRows,
  })
})
