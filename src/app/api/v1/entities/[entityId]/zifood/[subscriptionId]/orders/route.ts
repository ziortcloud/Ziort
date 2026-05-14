// GET  /…/zifood/:subscriptionId/orders
// POST /…/zifood/:subscriptionId/orders  — open order + first KOT
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateOrderSchema } from '@/zifood/validators'
import { nextOrderCode, nextKotCode } from '@/zifood/services/codes'
import { calcLineItem, calcTotals } from '@/zidocs/services/gst'
import { amountInWords } from '@/zidocs/services/amount-words'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const date_from = searchParams.get('date_from')
  const date_to   = searchParams.get('date_to')
  const table_id  = searchParams.get('table_id')

  let query = db.from('zfd_orders')
    .select(`
      id, zi_code, order_type, table_id, customer_name, num_guests,
      grand_total_paise, amount_paid_paise, status, kot_printed, opened_at, billed_at,
      zfd_tables ( name, zi_code )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (table_id) query = query.eq('table_id', table_id)
  if (date_from) query = query.gte('opened_at', date_from)
  if (date_to)   query = query.lte('opened_at', `${date_to}T23:59:59`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load orders', error)
  return ok({ orders: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateOrderSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // If table specified, check availability
  let table: any = null
  if (parsed.data.table_id) {
    const { data: t } = await db.from('zfd_tables')
      .select('id,entity_id,status,name').eq('id', parsed.data.table_id).single()
    if (!t || t.entity_id !== entityId) return conflict('Table not found')
    if (t.status === 'OCCUPIED') return conflict(`${t.name} is already occupied`)
    table = t
  }

  // Resolve supply type from settings
  const { data: settings } = await db.from('zfd_settings')
    .select('supply_type,service_charge_pct').eq('entity_id', entityId).maybeSingle()
  const supply_type   = settings?.supply_type ?? 'INTRASTATE'
  const is_interstate = supply_type === 'INTERSTATE'
  const svc_pct       = settings?.service_charge_pct ?? 0

  // Compute line items
  const computedItems = parsed.data.items.map((item, idx) => {
    const result = calcLineItem({
      qty: item.qty, rate_paise: item.rate_paise,
      discount_pct: item.discount_pct ?? 0,
      gst_rate_pct: item.gst_rate_pct ?? 5,
      is_interstate,
    })
    return {
      menu_item_id:         item.menu_item_id ?? null,
      item_name:            item.item_name,
      is_veg:               item.is_veg ?? true,
      qty:                  item.qty,
      rate_paise:           item.rate_paise,
      discount_pct:         item.discount_pct ?? 0,
      gst_rate_pct:         item.gst_rate_pct ?? 5,
      special_instructions: item.special_instructions ?? null,
      sort_order:           item.sort_order ?? idx,
      kot_status:           'PENDING' as const,
      ...result,
      total_paise: result.taxable_amount_paise + result.cgst_paise + result.sgst_paise + result.igst_paise,
    }
  })

  const totals              = calcTotals(computedItems)
  const service_charge_paise = Math.round(totals.subtotal_paise * (svc_pct / 100))
  const grand_total_paise    = totals.grand_total_paise + service_charge_paise

  const zi_code = await nextOrderCode()

  const { data: order, error: orderErr } = await db.from('zfd_orders').insert({
    zi_code,
    entity_id:            entityId,
    subscription_id:      subscriptionId,
    table_id:             parsed.data.table_id ?? null,
    order_type:           parsed.data.order_type ?? 'DINE_IN',
    customer_name:        parsed.data.customer_name ?? null,
    customer_mobile:      parsed.data.customer_mobile ?? null,
    num_guests:           parsed.data.num_guests ?? 1,
    gross_amount_paise:   computedItems.reduce((s, i) => s + i.gross_amount_paise, 0),
    discount_paise:       totals.total_discount_paise,
    taxable_amount_paise: totals.subtotal_paise,
    cgst_paise:           totals.total_cgst_paise,
    sgst_paise:           totals.total_sgst_paise,
    igst_paise:           totals.total_igst_paise,
    service_charge_paise,
    grand_total_paise,
    amount_paid_paise:    0,
    amount_words:         amountInWords(grand_total_paise),
    notes:                parsed.data.notes ?? null,
    created_by:           session.individual.id,
  }).select().single()

  if (orderErr || !order) return serverError('Failed to create order', orderErr)

  // Insert items
  const itemsToInsert = computedItems.map(i => ({ ...i, order_id: order.id }))
  await db.from('zfd_order_items').insert(itemsToInsert)

  // Mark table OCCUPIED
  if (table) {
    await db.from('zfd_tables').update({ status: 'OCCUPIED' }).eq('id', table.id)
  }

  // Auto-create first KOT
  const kotCode = await nextKotCode()
  const { data: kot } = await db.from('zfd_kots').insert({
    zi_code:    kotCode,
    order_id:   order.id,
    entity_id:  entityId,
    table_name: table?.name ?? parsed.data.order_type ?? 'TAKEAWAY',
    item_count: computedItems.length,
    status:     'SENT',
    created_by: session.individual.id,
  }).select().single()

  // Mark items as sent
  await db.from('zfd_order_items')
    .update({ kot_status: 'SENT', kot_sent_at: new Date().toISOString() })
    .eq('order_id', order.id)

  await writeAudit({ action: 'CREATE', table_name: 'zfd_orders', record_id: order.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, grand_total_paise, table_id: parsed.data.table_id },
    ...extractRequestMeta(req) })

  return created({ ...order, items: itemsToInsert, kot })
})
