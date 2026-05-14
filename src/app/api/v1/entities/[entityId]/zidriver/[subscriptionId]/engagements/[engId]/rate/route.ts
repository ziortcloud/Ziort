// POST /api/v1/entities/:entityId/zidriver/:subscriptionId/engagements/:engId/rate
// Hirer rates the driver after engagement is COMPLETED
// DB trigger updates avg_rating and total_ratings on zdr_profiles
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { SubmitDriverRatingSchema } from '@/zidriver/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, engId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: eng } = await db.from('zdr_engagements')
    .select('id,status,hirer_entity_id,driver_entity_id').eq('id', engId).single()
  if (!eng) return notFound('Engagement')

  if (eng.hirer_entity_id !== entityId)
    return conflict('Only the hirer can rate the driver for this engagement')

  if (eng.status !== 'COMPLETED')
    return conflict('Ratings can only be submitted after the engagement is completed')

  const { data: existing } = await db.from('zdr_ratings')
    .select('id').eq('engagement_id', engId).eq('hirer_entity_id', entityId).maybeSingle()
  if (existing) return conflict('You have already rated this engagement')

  const parsed = SubmitDriverRatingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: rating, error } = await db.from('zdr_ratings').insert({
    engagement_id:    engId,
    hirer_entity_id:  entityId,
    driver_entity_id: eng.driver_entity_id,
    rating:           parsed.data.rating,
    review:           parsed.data.review ?? null,
    rated_by:         session.individual.id,
  }).select().single()

  if (error || !rating) return serverError('Failed to submit rating', error)

  await writeAudit({ action: 'CREATE', table_name: 'zdr_ratings', record_id: rating.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { engagement_id: engId, driver_entity_id: eng.driver_entity_id, rating: parsed.data.rating },
    ...extractRequestMeta(req) })

  return created(rating)
})
