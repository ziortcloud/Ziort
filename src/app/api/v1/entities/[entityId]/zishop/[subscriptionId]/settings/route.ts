// GET   /…/zishop/:subscriptionId/settings
// PATCH /…/zishop/:subscriptionId/settings
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpsertShopSettingsSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zsh_settings')
    .select('*').eq('entity_id', entityId).maybeSingle()
  if (error) return serverError('Failed to load shop settings', error)
  return ok(data ?? {})
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpsertShopSettingsSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()
  const { data, error } = await db.from('zsh_settings').upsert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    updated_at:      now,
  }, { onConflict: 'entity_id' }).select().single()

  if (error || !data) return serverError('Failed to save shop settings', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_settings', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})
