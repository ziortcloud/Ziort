// GET  /…/products/:productId/stock  — current stock + movement history
// POST /…/products/:productId/stock  — manual stock adjustment
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { StockAdjustmentSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, productId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: product } = await db.from('zsh_products')
    .select('id,entity_id,name,track_stock').eq('id', productId).single()
  if (!product) return notFound('Product')
  if (product.entity_id !== entityId) return conflict('Access denied')

  const { page, limit, offset } = parsePagination(req.url)

  const [stockResult, movementsResult] = await Promise.all([
    db.from('zsh_stock').select('*').eq('product_id', productId).maybeSingle(),
    db.from('zsh_stock_movements')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
  ])

  return ok({
    product:   { id: product.id, name: product.name, track_stock: product.track_stock },
    stock:     stockResult.data ?? { qty_on_hand: 0, reorder_level: 0, reorder_qty: 0 },
    movements: movementsResult.data ?? [],
    total:     movementsResult.count ?? 0,
    page,
    limit,
  })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, productId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: product } = await db.from('zsh_products')
    .select('id,entity_id,track_stock').eq('id', productId).single()
  if (!product) return notFound('Product')
  if (product.entity_id !== entityId) return conflict('Access denied')
  if (!product.track_stock) return conflict('Stock tracking is disabled for this product')

  const parsed = StockAdjustmentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: stockRow } = await db.from('zsh_stock')
    .select('qty_on_hand').eq('product_id', productId).maybeSingle()
  const qty_before = stockRow?.qty_on_hand ?? 0
  const qty_after  = qty_before + parsed.data.qty_change

  if (qty_after < 0)
    return conflict(`Adjustment would result in negative stock (current: ${qty_before}, change: ${parsed.data.qty_change})`)

  // Update stock level
  await db.from('zsh_stock').upsert({
    product_id:  productId,
    entity_id:   entityId,
    qty_on_hand: qty_after,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'product_id' })

  // Record movement
  const { data: movement, error } = await db.from('zsh_stock_movements').insert({
    entity_id:      entityId,
    product_id:     productId,
    movement_type:  parsed.data.movement_type,
    qty_change:     parsed.data.qty_change,
    qty_before,
    qty_after,
    reference_type: 'MANUAL',
    note:           parsed.data.note ?? null,
    created_by:     session.individual.id,
  }).select().single()

  if (error || !movement) return serverError('Failed to record stock adjustment', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_stock', record_id: productId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { movement_type: parsed.data.movement_type, qty_change: parsed.data.qty_change, qty_after },
    ...extractRequestMeta(req) })

  return ok({ qty_on_hand: qty_after, movement })
})
