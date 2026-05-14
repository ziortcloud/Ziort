// GET   /api/v1/entities/:entityId/zidriver/:subscriptionId/profile
// POST  /api/v1/entities/:entityId/zidriver/:subscriptionId/profile  (create)
// PATCH /api/v1/entities/:entityId/zidriver/:subscriptionId/profile  (update)
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateDriverProfileSchema, UpdateDriverProfileSchema } from '@/zidriver/validators'
import { nextDriverProfileCode } from '@/zidriver/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile, error } = await db.from('zdr_profiles')
    .select('*').eq('entity_id', entityId).maybeSingle()

  if (error) return serverError('Failed to load driver profile', error)
  if (!profile) return notFound('Driver profile')
  return ok(profile)
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zdr_profiles')
    .select('id').eq('entity_id', entityId).maybeSingle()
  if (existing) return conflict('Driver profile already exists — use PATCH to update')

  const parsed = CreateDriverProfileSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { mobile, ...rest } = parsed.data
  const mobile_hash = crypto.createHash('sha256').update(mobile).digest('hex')
  const mobile_last4 = mobile.slice(-4)

  const zi_code = await nextDriverProfileCode()

  const { data: profile, error } = await db.from('zdr_profiles').insert({
    ...rest,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    mobile_hash,
    mobile_last4,
  }).select().single()

  if (error || !profile) return serverError('Failed to create driver profile', error)

  await writeAudit({ action: 'CREATE', table_name: 'zdr_profiles', record_id: profile.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, full_name: rest.full_name, home_city: rest.home_city },
    ...extractRequestMeta(req) })

  return created(profile)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zdr_profiles')
    .select('id').eq('entity_id', entityId).maybeSingle()
  if (!profile) return notFound('Driver profile — create it first via POST')

  const parsed = UpdateDriverProfileSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zdr_profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('entity_id', entityId).select().single()

  if (error || !updated) return serverError('Failed to update driver profile', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zdr_profiles', record_id: profile.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(updated)
})
