// GET  /…/zishop/:subscriptionId/bills
// POST /…/zishop/:subscriptionId/bills  — create bill + line items atomically
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateBillSchema } from '@/zishop/validators'
import { nextBillCode } from '@/zishop/services/codes'
import { calcLineItem, calcTotals } from '@/zidocs/services/gst'
import { amountInWords } from '@/zidocs/services/amount-words'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status      = searchParams.get('status') ?? 'PAID'
  const date_from   = searchParams.get('date_from')
  const date_to     = searchParams.get('date_to')
  const customer_id = searchParams.get('customer_id')
  const search      = searchParams.get('q')

  let query = db.from('zsh_bills')
    .select(`
      id, zi_code, customer_name, customer_mobile, bill_date, supply_type,
      grand_total_paise, amount_paid_paise, amount_due_paise, status,
      customer_id, branch_id, created_at
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('bill_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)      query = query.eq('status', status)
  if (date_from)   query = query.gte('bill_date', date_from)
  if (date_to)     query = query.lte('bill_date', date_to)
  if (customer_id) query = query.eq('customer_id', customer_id)
  if (search)      query = query.or(
    `zi_code.ilike.%${search}%,customer_name.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return serverError('Failed to load bills', error)
  return ok({ bills: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateBillSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { items, loyalty_points_to_redeem, customer_id, ...billFields } = parsed.data
  const supply_type = billFields.supply_type ?? 'INTRASTATE'
  const is_interstate = supply_type === 'INTERSTATE'

  // Resolve loyalty discount if customer provided
  let loyalty_discount_paise = 0
  let loyalty_points_used = 0
  let customer: any = null

  if (customer_id) {
    const { data: cust } = await db.from('zsh_customers')
      .select('id,entity_id,loyalty_points,name,mobile_last4').eq('id', customer_id).single()
    if (!cust || cust.entity_id !== entityId)
      return conflict('Customer not found or belongs to another entity')
    customer = cust

    // Resolve loyalty settings
    if ((loyalty_points_to_redeem ?? 0) > 0) {
      const { data: settings } = await db.from('zsh_settings')
        .select('loyalty_enabled,loyalty_rupee_per_point').eq('entity_id', entityId).maybeSingle()
      if (settings?.loyalty_enabled) {
        const points_to_use = Math.min(loyalty_points_to_redeem!, cust.loyalty_points)
        loyalty_discount_paise = Math.round(points_to_use * (settings.loyalty_rupee_per_point ?? 0) * 100)
        loyalty_points_used = points_to_use
      }
    }
  }

  // Compute each line item
  const computedItems = items.map((item, idx) => {
    const result = calcLineItem({
      qty:          item.qty,
      rate_paise:   item.rate_paise,
      discount_pct: item.discount_pct ?? 0,
      gst_rate_pct: item.gst_rate_pct ?? 0,
      is_interstate,
    })
    return {
      product_id:           item.product_id ?? null,
      product_name:         item.product_name,
      hsn_sac_code:         item.hsn_sac_code ?? null,
      unit:                 item.unit ?? 'PCS',
      barcode:              item.barcode ?? null,
      qty:                  item.qty,
      rate_paise:           item.rate_paise,
      discount_pct:         item.discount_pct ?? 0,
      gst_rate_pct:         item.gst_rate_pct ?? 0,
      cess_rate_pct:        item.cess_rate_pct ?? 0,
      sort_order:           item.sort_order ?? idx,
      ...result,
      cess_paise: Math.round(result.taxable_amount_paise * ((item.cess_rate_pct ?? 0) / 100)),
    }
  })

  const totals = calcTotals(computedItems)
  const grand_total_paise = totals.grand_total_paise - loyalty_discount_paise

  // Loyalty points earned on this bill (₹ spent / 100 = rupees; × points_per_rupee)
  let loyalty_points_earned = 0
  if (customer_id) {
    const { data: settings } = await db.from('zsh_settings')
      .select('loyalty_enabled,loyalty_points_per_rupee').eq('entity_id', entityId).maybeSingle()
    if (settings?.loyalty_enabled) {
      loyalty_points_earned = Math.floor(
        (grand_total_paise / 100) * (settings.loyalty_points_per_rupee ?? 0)
      )
    }
  }

  const zi_code = await nextBillCode()

  // Create bill header
  const { data: bill, error: billErr } = await db.from('zsh_bills').insert({
    zi_code,
    entity_id:             entityId,
    subscription_id:       subscriptionId,
    branch_id:             billFields.branch_id ?? null,
    customer_id:           customer_id ?? null,
    customer_name:         billFields.customer_name ?? customer?.name ?? null,
    customer_mobile:       billFields.customer_mobile ?? (customer?.mobile_last4 ? `****${customer.mobile_last4}` : null),
    customer_gstin:        billFields.customer_gstin ?? null,
    bill_date:             billFields.bill_date ?? new Date().toISOString().split('T')[0],
    supply_type,
    gross_amount_paise:    computedItems.reduce((s, i) => s + i.gross_amount_paise, 0),
    discount_paise:        totals.total_discount_paise,
    taxable_amount_paise:  totals.subtotal_paise,
    cgst_paise:            totals.total_cgst_paise,
    sgst_paise:            totals.total_sgst_paise,
    igst_paise:            totals.total_igst_paise,
    cess_paise:            computedItems.reduce((s, i) => s + i.cess_paise, 0),
    grand_total_paise,
    amount_paid_paise:     0,
    amount_due_paise:      grand_total_paise,
    amount_words:          amountInWords(grand_total_paise),
    loyalty_points_used,
    loyalty_points_earned,
    loyalty_discount_paise,
    notes:                 billFields.notes ?? null,
    status:                'DRAFT',
    created_by:            session.individual.id,
  }).select().single()

  if (billErr || !bill) return serverError('Failed to create bill', billErr)

  // Insert all line items
  const itemsToInsert = computedItems.map(item => ({ ...item, bill_id: bill.id }))
  const { error: itemsErr } = await db.from('zsh_bill_items').insert(itemsToInsert)
  if (itemsErr) return serverError('Failed to add bill items', itemsErr)

  await writeAudit({ action: 'CREATE', table_name: 'zsh_bills', record_id: bill.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, grand_total_paise, item_count: items.length },
    ...extractRequestMeta(req) })

  return created({ ...bill, items: itemsToInsert })
})
