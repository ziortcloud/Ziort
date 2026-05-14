// POST /…/orders/:orderId/items  — add more items + fire a new KOT
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddOrderItemsSchema } from '@/zifood/validators'
import { nextKotCode } from '@/zifood/services/codes'
import { calcLineItem, calcTotals } from '@/zidocs/services/gst'
import { amountInWords } from '@/zidocs/services/amount-words'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, orderId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: order } = await db.from('zfd_orders')
    .select('id,entity_id,status,table_id').eq('id', orderId).single()
  if (!order) return notFound('Order')
  if (order.entity_id !== entityId) return conflict('Access denied')
  if (!['OPEN'].includes(order.status))
    return conflict(`Cannot add items to a ${order.status} order`)

  const parsed = AddOrderItemsSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: settings } = await db.from('zfd_settings')
    .select('supply_type,service_charge_pct').eq('entity_id', entityId).maybeSingle()
  const is_interstate = (settings?.supply_type ?? 'INTRASTATE') === 'INTERSTATE'
  const svc_pct       = settings?.service_charge_pct ?? 0

  // Get current item count for sort_order
  const { count: existingCount } = await db.from('zfd_order_items')
    .select('id', { count: 'exact', head: true }).eq('order_id', orderId)

  const newItems = parsed.data.items.map((item, idx) => {
    const result = calcLineItem({
      qty: item.qty, rate_paise: item.rate_paise,
      discount_pct: item.discount_pct ?? 0,
      gst_rate_pct: item.gst_rate_pct ?? 5,
      is_interstate,
    })
    return {
      order_id:             orderId,
      menu_item_id:         item.menu_item_id ?? null,
      item_name:            item.item_name,
      is_veg:               item.is_veg ?? true,
      qty:                  item.qty,
      rate_paise:           item.rate_paise,
      discount_pct:         item.discount_pct ?? 0,
      gst_rate_pct:         item.gst_rate_pct ?? 5,
      special_instructions: item.special_instructions ?? null,
      sort_order:           (existingCount ?? 0) + idx,
      kot_status:           'PENDING' as const,
      ...result,
      total_paise: result.taxable_amount_paise + result.cgst_paise + result.sgst_paise + result.igst_paise,
    }
  })

  const { error: itemsErr } = await db.from('zfd_order_items').insert(newItems)
  if (itemsErr) return serverError('Failed to add items', itemsErr)

  // Recalculate order totals from all items
  const { data: allItems } = await db.from('zfd_order_items')
    .select('*').eq('order_id', orderId).neq('kot_status', 'CANCELLED')
  const totals               = calcTotals(allItems ?? [])
  const service_charge_paise = Math.round(totals.subtotal_paise * (svc_pct / 100))
  const grand_total_paise    = totals.grand_total_paise + service_charge_paise
  const gross_amount_paise   = (allItems ?? []).reduce((s: number, i: any) => s + (i.gross_amount_paise ?? 0), 0)

  await db.from('zfd_orders').update({
    gross_amount_paise,
    discount_paise:       totals.total_discount_paise,
    taxable_amount_paise: totals.subtotal_paise,
    cgst_paise:           totals.total_cgst_paise,
    sgst_paise:           totals.total_sgst_paise,
    igst_paise:           totals.total_igst_paise,
    service_charge_paise,
    grand_total_paise,
    amount_words:         amountInWords(grand_total_paise),
    updated_at:           new Date().toISOString(),
  }).eq('id', orderId)

  // Fire a new KOT for these items
  const kotCode = await nextKotCode()
  const { data: kot } = await db.from('zfd_kots').insert({
    zi_code:    kotCode,
    order_id:   orderId,
    entity_id:  entityId,
    table_name: null,
    item_count: newItems.length,
    status:     'SENT',
    created_by: session.individual.id,
  }).select().single()

  await db.from('zfd_order_items')
    .update({ kot_status: 'SENT', kot_sent_at: new Date().toISOString() })
    .eq('order_id', orderId).eq('kot_status', 'PENDING')

  await writeAudit({ action: 'UPDATE', table_name: 'zfd_orders', record_id: orderId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { added_items: newItems.length, grand_total_paise }, ...extractRequestMeta(req) })

  return created({ items: newItems, kot, grand_total_paise })
})
