// GET   /api/v1/entities/:entityId/zineed/:subscriptionId/deals/:dealId
// PATCH /api/v1/entities/:entityId/zineed/:subscriptionId/deals/:dealId
// PATCH: complete or cancel a deal
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, forbidden, badRequest, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateDealSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'disputed', 'cancelled']),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, dealId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: deal, error } = await db
    .from('znd_deals')
    .select(`
      *,
      znd_requirements ( id, zi_code, title, category, description ),
      znd_proposals    ( id, zi_code, price_paise, delivery_days, notes )
    `)
    .eq('id', dealId)
    .single()

  if (error || !deal) return notFound('Deal')

  // Only buyer or seller can view
  if (deal.buyer_entity_id !== entityId && deal.seller_entity_id !== entityId) {
    return forbidden('Access denied')
  }

  // Load ratings for this deal
  const { data: ratings } = await db
    .from('znd_ratings')
    .select('id, score, review, rated_entity_id, rated_by, created_at')
    .eq('deal_id', dealId)

  return ok({ ...deal, ratings: ratings ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, dealId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: deal } = await db
    .from('znd_deals')
    .select('id, buyer_entity_id, seller_entity_id, status, ref_code, requirement_id')
    .eq('id', dealId)
    .single()

  if (!deal) return notFound('Deal')
  if (!['active', 'in_progress'].includes(deal.status)) {
    return badRequest(`Deal is already ${deal.status}`)
  }
  if (deal.buyer_entity_id !== entityId && deal.seller_entity_id !== entityId) {
    return forbidden('Access denied')
  }

  const body = await req.json()
  const parsed = UpdateDealSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { status } = parsed.data
  const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    // Mark requirement as completed
    await db.from('znd_requirements').update({ status: 'completed' }).eq('id', deal.requirement_id)
  }

  const { data: updated, error } = await db
    .from('znd_deals')
    .update(updateData)
    .eq('id', dealId)
    .select()
    .single()

  if (error || !updated) return serverError('Failed to update deal', error)

  await writeAudit({
    action: 'UPDATE', table_name: 'znd_deals',
    record_id: dealId, ref_code: deal.ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    old_value: { status: deal.status },
    new_value: { status },
    ...extractRequestMeta(req),
  })

  return ok(updated)
})
