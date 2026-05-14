// GET + PATCH + DELETE /…/menu/items/:itemId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateMenuItemSchema } from '@/zifood/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const { data, error } = await db.from('zfd_menu_items').select('*').eq('id', itemId).single()
  if (error || !data) return notFound('Menu item')
  if (data.entity_id !== entityId) return conflict('Access denied')
  return ok(data)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: item } = await db.from('zfd_menu_items')
    .select('id,entity_id').eq('id', itemId).single()
  if (!item) return notFound('Menu item')
  if (item.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateMenuItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zfd_menu_items')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', itemId).select().single()
  if (error || !data) return serverError('Failed to update menu item', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zfd_menu_items', record_id: itemId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: item } = await db.from('zfd_menu_items')
    .select('id,entity_id').eq('id', itemId).single()
  if (!item) return notFound('Menu item')
  if (item.entity_id !== entityId) return conflict('Access denied')

  const { error } = await db.from('zfd_menu_items')
    .update({ is_available: false, updated_at: new Date().toISOString() }).eq('id', itemId)
  if (error) return serverError('Failed to deactivate menu item', error)

  return ok({ deleted: true })
})
