// GET   /api/v1/entities/:entityId/zineed/:subscriptionId/requirements/:requirementId
// PATCH /api/v1/entities/:entityId/zineed/:subscriptionId/requirements/:requirementId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, forbidden, badRequest, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateRequirementSchema = z.object({
  title:            z.string().min(5).max(200).optional(),
  description:      z.string().min(10).max(2000).optional(),
  status:           z.enum(['draft','published','cancelled']).optional(),
  is_urgent:        z.boolean().optional(),
  budget_min_paise: z.number().int().min(0).optional().nullable(),
  budget_max_paise: z.number().int().min(0).optional().nullable(),
  delivery_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable(),
  expires_days:     z.number().int().min(1).max(90).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, requirementId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: req_, error } = await db
    .from('znd_requirements')
    .select('*')
    .eq('id', requirementId)
    .eq('subscription_id', subscriptionId)
    .single()

  if (error || !req_) return notFound('Requirement')

  // Proposals received (non-withdrawn, non-rejected)
  const { data: proposals } = await db
    .from('znd_proposals')
    .select('id, zi_code, price_paise, delivery_days, status, created_at, entity_id')
    .eq('requirement_id', requirementId)
    .order('price_paise', { ascending: true })

  return ok({ ...req_, proposals: proposals ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, requirementId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db
    .from('znd_requirements')
    .select('id, entity_id, status, ref_code')
    .eq('id', requirementId)
    .eq('subscription_id', subscriptionId)
    .single()

  if (!existing) return notFound('Requirement')
  if (existing.entity_id !== entityId) return forbidden('You can only edit your own requirements')
  if (['deal_closed','completed','expired'].includes(existing.status)) {
    return badRequest(`Cannot edit a ${existing.status} requirement`)
  }

  const body = await req.json()
  const parsed = UpdateRequirementSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const updateData: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.expires_days) {
    updateData.expires_at = new Date(Date.now() + parsed.data.expires_days * 86400000).toISOString().slice(0, 10)
    delete updateData.expires_days
  }

  const { data: updated, error } = await db
    .from('znd_requirements')
    .update(updateData)
    .eq('id', requirementId)
    .select()
    .single()

  if (error || !updated) return serverError('Failed to update requirement', error)

  await writeAudit({
    action: 'UPDATE', table_name: 'znd_requirements',
    record_id: requirementId, ref_code: existing.ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data,
    ...extractRequestMeta(req),
  })

  return ok(updated)
})
