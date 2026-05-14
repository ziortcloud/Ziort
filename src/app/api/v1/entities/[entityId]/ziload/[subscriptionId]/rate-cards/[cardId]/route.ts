// GET   /api/v1/entities/:entityId/ziload/:subscriptionId/rate-cards/:cardId
// PATCH /api/v1/entities/:entityId/ziload/:subscriptionId/rate-cards/:cardId
// PATCH deactivates or updates the rate card; owner-only
import { z } from 'zod'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateRateCardSchema } from '@/ziload/validators'

const PatchRateCardSchema = CreateRateCardSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, cardId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: card, error } = await db.from('zld_rate_cards')
    .select(`
      *,
      zld_profiles!zld_rate_cards_entity_id_fkey ( company_name, city, avg_rating, verified )
    `)
    .eq('id', cardId).single()

  if (error || !card) return notFound('Rate card')
  return ok(card)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, cardId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: card } = await db.from('zld_rate_cards')
    .select('id,entity_id').eq('id', cardId).single()
  if (!card) return notFound('Rate card')
  if (card.entity_id !== entityId) return conflict('Cannot modify another entity\'s rate card')

  const parsed = PatchRateCardSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zld_rate_cards')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', cardId).select().single()

  if (error || !updated) return serverError('Failed to update rate card', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zld_rate_cards', record_id: cardId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(updated)
})
