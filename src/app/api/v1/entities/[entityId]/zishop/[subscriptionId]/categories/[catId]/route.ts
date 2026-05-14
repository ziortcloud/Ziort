// GET   /…/categories/:catId
// PATCH /…/categories/:catId
// DELETE /…/categories/:catId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateCategorySchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, catId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zsh_categories')
    .select('*').eq('id', catId).single()
  if (error || !data) return notFound('Category')
  if (data.entity_id !== entityId) return conflict('Access denied')
  return ok(data)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, catId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: cat } = await db.from('zsh_categories')
    .select('id,entity_id').eq('id', catId).single()
  if (!cat) return notFound('Category')
  if (cat.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateCategorySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zsh_categories')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', catId).select().single()
  if (error || !data) return serverError('Failed to update category', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_categories', record_id: catId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, catId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: cat } = await db.from('zsh_categories')
    .select('id,entity_id').eq('id', catId).single()
  if (!cat) return notFound('Category')
  if (cat.entity_id !== entityId) return conflict('Access denied')

  // Check if any products use this category
  const { count } = await db.from('zsh_products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', catId).eq('is_active', true)
  if ((count ?? 0) > 0)
    return conflict('Cannot delete a category that has active products — reassign products first')

  // Soft-delete (deactivate) rather than hard delete
  const { error } = await db.from('zsh_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', catId)
  if (error) return serverError('Failed to delete category', error)

  await writeAudit({ action: 'DELETE', table_name: 'zsh_categories', record_id: catId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_active: false }, ...extractRequestMeta(req) })

  return ok({ deleted: true })
})
