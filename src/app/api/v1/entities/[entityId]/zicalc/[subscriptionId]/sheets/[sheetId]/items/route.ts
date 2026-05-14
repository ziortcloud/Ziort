// GET  /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets/:sheetId/items
// POST /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets/:sheetId/items
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddCalcItemSchema } from '@/zicalc/validators'
import { recalcSheetTotals } from '@/zidocs/services/totals'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: sheet } = await db.from('zclc_sheets')
    .select('id,entity_id').eq('id', sheetId).single()
  if (!sheet) return notFound('Cost sheet')
  if (sheet.entity_id !== entityId) return conflict('Cannot access another entity\'s sheet')

  const { data: items, error } = await db.from('zclc_items')
    .select('*').eq('sheet_id', sheetId).order('sort_order').order('created_at')
  if (error) return serverError('Failed to load items', error)
  return ok(items ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: sheet } = await db.from('zclc_sheets')
    .select('id,entity_id').eq('id', sheetId).single()
  if (!sheet) return notFound('Cost sheet')
  if (sheet.entity_id !== entityId) return conflict('Cannot add items to another entity\'s sheet')

  const parsed = AddCalcItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const total_paise = Math.round(parsed.data.qty * parsed.data.rate_paise)

  const { data: item, error } = await db.from('zclc_items').insert({
    ...parsed.data,
    sheet_id:    sheetId,
    total_paise,
  }).select().single()

  if (error || !item) return serverError('Failed to add item', error)

  await recalcSheetTotals(sheetId)
  return created(item)
})
