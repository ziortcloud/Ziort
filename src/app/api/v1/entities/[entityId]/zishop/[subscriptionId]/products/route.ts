// GET  /…/zishop/:subscriptionId/products
// POST /…/zishop/:subscriptionId/products
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateProductSchema } from '@/zishop/validators'
import { nextProductCode } from '@/zishop/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const search      = searchParams.get('q')
  const category_id = searchParams.get('category_id')
  const active_only = searchParams.get('active') !== 'false'
  const low_stock   = searchParams.get('low_stock') === 'true'
  const barcode     = searchParams.get('barcode')

  let query = db.from('zsh_products')
    .select(`
      id, zi_code, name, sku, barcode, unit, category_id,
      selling_price_paise, mrp_paise, gst_rate_pct, track_stock,
      is_active, image_url, created_at,
      zsh_stock ( qty_on_hand, reorder_level )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (active_only)  query = query.eq('is_active', true)
  if (category_id)  query = query.eq('category_id', category_id)
  if (barcode)      query = query.eq('barcode', barcode)
  if (search)       query = query.or(
    `name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%,hsn_sac_code.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return serverError('Failed to load products', error)

  let results = data ?? []

  // Filter low-stock products (qty_on_hand <= reorder_level, track_stock = true)
  if (low_stock) {
    results = results.filter((p: any) =>
      p.track_stock && p.zsh_stock &&
      p.zsh_stock.qty_on_hand <= p.zsh_stock.reorder_level
    )
  }

  return ok({ products: results, total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateProductSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { opening_stock, reorder_level, reorder_qty, ...productFields } = parsed.data
  const zi_code = await nextProductCode()

  const { data: product, error: prodErr } = await db.from('zsh_products').insert({
    ...productFields,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (prodErr || !product) return serverError('Failed to create product', prodErr)

  // Seed stock record for this product
  await db.from('zsh_stock').insert({
    product_id:    product.id,
    entity_id:     entityId,
    qty_on_hand:   opening_stock ?? 0,
    reorder_level: reorder_level ?? 0,
    reorder_qty:   reorder_qty ?? 0,
  })

  // Record opening stock movement if any
  if ((opening_stock ?? 0) > 0) {
    await db.from('zsh_stock_movements').insert({
      entity_id:      entityId,
      product_id:     product.id,
      movement_type:  'OPENING',
      qty_change:     opening_stock!,
      qty_before:     0,
      qty_after:      opening_stock!,
      reference_type: 'MANUAL',
      note:           'Opening stock on product creation',
      created_by:     session.individual.id,
    })
  }

  await writeAudit({ action: 'CREATE', table_name: 'zsh_products', record_id: product.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: productFields.name, selling_price_paise: productFields.selling_price_paise },
    ...extractRequestMeta(req) })

  return created({ ...product, qty_on_hand: opening_stock ?? 0 })
})
