// GET /api/v1/entities/:entityId/zidriver/:subscriptionId/ratings
// Driver views all ratings they have received
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)

  const { data: ratings, count, error } = await db.from('zdr_ratings')
    .select(`
      id, rating, review, created_at,
      zdr_engagements ( zi_code, title, from_city, to_city, start_date ),
      hirer:zi_entities!zdr_ratings_hirer_entity_id_fkey ( id, name )
    `, { count: 'exact' })
    .eq('driver_entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load ratings', error)

  // Summary stats
  const { data: profile } = await db.from('zdr_profiles')
    .select('avg_rating,total_ratings').eq('entity_id', entityId).maybeSingle()

  return ok({
    ratings:       ratings ?? [],
    total:         count ?? 0,
    page,
    limit,
    avg_rating:    profile?.avg_rating    ?? 0,
    total_ratings: profile?.total_ratings ?? 0,
  })
})
