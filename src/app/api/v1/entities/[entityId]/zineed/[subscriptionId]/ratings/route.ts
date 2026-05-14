// POST /api/v1/entities/:entityId/zineed/:subscriptionId/ratings
// Rate the counterparty after a completed deal (one rating per rater per deal)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextRatingCode } from '@/zineed/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, badRequest, notFound, forbidden, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateRatingSchema } from '@/zineed/validators'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const body = await req.json()
  const parsed = CreateRatingSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { deal_id, score, review } = parsed.data

  // Load deal and check it's completed
  const { data: deal } = await db
    .from('znd_deals')
    .select('id, buyer_entity_id, seller_entity_id, status, ref_code')
    .eq('id', deal_id)
    .single()

  if (!deal) return notFound('Deal')
  if (deal.status !== 'completed') return badRequest('Can only rate completed deals')
  if (deal.buyer_entity_id !== entityId && deal.seller_entity_id !== entityId) {
    return forbidden('You were not part of this deal')
  }

  // The entity being rated is the counterparty
  const rated_entity_id = deal.buyer_entity_id === entityId ? deal.seller_entity_id : deal.buyer_entity_id

  // Duplicate check: one rating per individual per deal
  const { data: existing } = await db
    .from('znd_ratings')
    .select('id, zi_code')
    .eq('deal_id', deal_id)
    .eq('rated_by', session.individual.id)
    .maybeSingle()

  if (existing) return conflict(`You already rated this deal (${existing.zi_code})`)

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const rtg_code  = await nextRatingCode()
  const ref_code  = `${entity_zi}${sub.zi_code}${rtg_code}`

  const { data: rating, error } = await db
    .from('znd_ratings')
    .insert({
      zi_code:        rtg_code,
      ref_code,
      deal_id,
      rated_by:       session.individual.id,
      rated_entity_id,
      score,
      review:         review ?? null,
    })
    .select()
    .single()

  if (error || !rating) return serverError('Failed to submit rating', error)

  await writeAudit({
    action: 'CREATE', table_name: 'znd_ratings',
    record_id: rating.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { rtg_code, deal_id, rated_entity_id, score },
    ...extractRequestMeta(req),
  })

  return created(rating)
})
