// GET   /api/v1/entities/:entityId/zipawn/:subscriptionId/schemes/:schemeId
// PATCH /api/v1/entities/:entityId/zipawn/:subscriptionId/schemes/:schemeId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateSchemeSchema } from '@/zipawn/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, schemeId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: scheme, error } = await db.from('zpn_schemes')
    .select('*').eq('id', schemeId).eq('entity_id', entityId).single()
  if (error || !scheme) return notFound('Scheme')
  return ok(scheme)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, schemeId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zpn_schemes')
    .select('id').eq('id', schemeId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Scheme')

  const parsed = UpdateSchemeSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // If setting as default, clear others first
  if (parsed.data.is_default) {
    await db.from('zpn_schemes').update({ is_default: false })
      .eq('entity_id', entityId).eq('subscription_id', subscriptionId).neq('id', schemeId)
  }

  const { data: scheme, error } = await db.from('zpn_schemes')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', schemeId).select().single()

  if (error || !scheme) return serverError('Failed to update scheme', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_schemes', record_id: schemeId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(scheme)
})
