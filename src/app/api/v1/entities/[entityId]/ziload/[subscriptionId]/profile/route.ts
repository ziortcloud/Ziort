// GET   /api/v1/entities/:entityId/ziload/:subscriptionId/profile
// PATCH /api/v1/entities/:entityId/ziload/:subscriptionId/profile
// ZiLoad identity — role (shipper/transporter/agency), GSTIN, city, ratings
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpsertProfileSchema } from '@/ziload/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile, error } = await db.from('zld_profiles')
    .select('*').eq('entity_id', entityId).maybeSingle()

  if (error) return serverError('Failed to load profile', error)
  return ok(profile ?? null)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpsertProfileSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: existing } = await db.from('zld_profiles')
    .select('id').eq('entity_id', entityId).maybeSingle()

  if (existing) {
    const { data: profile, error } = await db.from('zld_profiles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('entity_id', entityId).select().single()
    if (error || !profile) return serverError('Failed to update profile', error)

    await writeAudit({ action: 'UPDATE', table_name: 'zld_profiles', record_id: profile.id,
      entity_id: entityId, individual_id: session.individual.id,
      new_value: parsed.data, ...extractRequestMeta(req) })
    return ok(profile)
  }

  const { data: profile, error } = await db.from('zld_profiles').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
  }).select().single()

  if (error || !profile) return serverError('Failed to create profile', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_profiles', record_id: profile.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return created(profile)
})
