// GET   /…/products/:productId
// PATCH /…/products/:productId
// DELETE /…/products/:productId  — soft deactivate
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateProductSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, productId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zsh_products')
    .select(`*, zsh_stock ( qty_on_hand, reorder_level, reorder_qty, updated_at )`)
    .eq('id', productId).single()
  if (error || !data) return notFound('Product')
  if (data.entity_id !== entityId) return conflict('Access denied')
  return ok(data)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, productId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: product } = await db.from('zsh_products')
    .select('id,entity_id').eq('id', productId).single()
  if (!product) return notFound('Product')
  if (product.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateProductSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zsh_products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', productId).select().single()
  if (error || !data) return serverError('Failed to update product', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_products', record_id: productId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, productId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: product } = await db.from('zsh_products')
    .select('id,entity_id').eq('id', productId).single()
  if (!product) return notFound('Product')
  if (product.entity_id !== entityId) return conflict('Access denied')

  const { error } = await db.from('zsh_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) return serverError('Failed to deactivate product', error)

  await writeAudit({ action: 'DELETE', table_name: 'zsh_products', record_id: productId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_active: false }, ...extractRequestMeta(req) })

  return ok({ deleted: true })
})
