// GET    /…/sheets/:sheetId/items/:itemId
// PATCH  /…/sheets/:sheetId/items/:itemId
// DELETE /…/sheets/:sheetId/items/:itemId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateCalcItemSchema } from '@/zicalc/validators'
import { recalcSheetTotals } from '@/zidocs/services/totals'

async function getItemAndVerifyOwner(sheetId: string, itemId: string, entityId: string) {
  const [{ data: sheet }, { data: item }] = await Promise.all([
    db.from('zclc_sheets').select('id,entity_id').eq('id', sheetId).single(),
    db.from('zclc_items').select('*').eq('id', itemId).eq('sheet_id', sheetId).single(),
  ])
  return { sheet, item }
}

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { sheet, item } = await getItemAndVerifyOwner(sheetId, itemId, entityId)
  if (!sheet || !item) return notFound('Item')
  if (sheet.entity_id !== entityId) return conflict('Access denied')
  return ok(item)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { sheet, item } = await getItemAndVerifyOwner(sheetId, itemId, entityId)
  if (!sheet || !item) return notFound('Item')
  if (sheet.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateCalcItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const qty        = parsed.data.qty        ?? item.qty
  const rate_paise = parsed.data.rate_paise ?? item.rate_paise
  const total_paise = Math.round(qty * rate_paise)

  const { data: updated, error } = await db.from('zclc_items')
    .update({ ...parsed.data, total_paise, updated_at: new Date().toISOString() })
    .eq('id', itemId).select().single()

  if (error || !updated) return serverError('Failed to update item', error)

  await recalcSheetTotals(sheetId)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { sheet, item } = await getItemAndVerifyOwner(sheetId, itemId, entityId)
  if (!sheet || !item) return notFound('Item')
  if (sheet.entity_id !== entityId) return conflict('Access denied')

  const { error } = await db.from('zclc_items').delete().eq('id', itemId)
  if (error) return serverError('Failed to delete item', error)

  await recalcSheetTotals(sheetId)
  return ok({ deleted: true, id: itemId })
})
