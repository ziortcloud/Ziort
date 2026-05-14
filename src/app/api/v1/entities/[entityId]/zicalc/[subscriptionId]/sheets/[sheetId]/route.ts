// GET    /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets/:sheetId
// PATCH  /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets/:sheetId
// DELETE /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets/:sheetId (archive)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateSheetSchema } from '@/zicalc/validators'
import { recalcSheetTotals } from '@/zidocs/services/totals'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: sheet, error } = await db.from('zclc_sheets')
    .select(`*, zclc_items ( * )`)
    .eq('id', sheetId).single()

  if (error || !sheet) return notFound('Cost sheet')
  if (sheet.entity_id !== entityId) return conflict('Cannot access another entity\'s cost sheet')
  return ok(sheet)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: sheet } = await db.from('zclc_sheets')
    .select('id,entity_id').eq('id', sheetId).single()
  if (!sheet) return notFound('Cost sheet')
  if (sheet.entity_id !== entityId) return conflict('Cannot modify another entity\'s cost sheet')

  const parsed = UpdateSheetSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const updatePayload: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.is_archived) updatePayload.archived_at = new Date().toISOString()

  const { data: updated, error } = await db.from('zclc_sheets')
    .update(updatePayload).eq('id', sheetId).select().single()
  if (error || !updated) return serverError('Failed to update sheet', error)

  // Recalc if margin changed
  if (parsed.data.margin_pct !== undefined) {
    await recalcSheetTotals(sheetId)
    const { data: refreshed } = await db.from('zclc_sheets').select('*').eq('id', sheetId).single()
    return ok(refreshed)
  }

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, sheetId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: sheet } = await db.from('zclc_sheets')
    .select('id,entity_id').eq('id', sheetId).single()
  if (!sheet) return notFound('Cost sheet')
  if (sheet.entity_id !== entityId) return conflict('Cannot delete another entity\'s cost sheet')

  const { error } = await db.from('zclc_sheets')
    .update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', sheetId)
  if (error) return serverError('Failed to archive sheet', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zclc_sheets', record_id: sheetId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_archived: true }, ...extractRequestMeta(req) })

  return ok({ archived: true, id: sheetId })
})
