// GET + PATCH /…/zichit/:subscriptionId/settings
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpsertChitSettingsSchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const { data, error } = await db.from('zct_settings')
    .select('*').eq('entity_id', entityId).maybeSingle()
  if (error) return serverError('Failed to load settings', error)
  return ok(data ?? {})
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const parsed = UpsertChitSettingsSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)
  const { data, error } = await db.from('zct_settings').upsert({
    ...parsed.data, entity_id: entityId, subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'entity_id' }).select().single()
  if (error || !data) return serverError('Failed to save settings', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zct_settings', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })
  return ok(data)
})
