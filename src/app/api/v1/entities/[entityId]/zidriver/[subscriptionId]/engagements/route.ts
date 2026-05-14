// GET /api/v1/entities/:entityId/zidriver/:subscriptionId/engagements
// Returns engagements where this entity is either the hirer or the driver
// ?role=hirer   — only engagements this entity created as hirer
// ?role=driver  — only engagements offered to this entity as driver
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const role   = searchParams.get('role')   // 'hirer' | 'driver'
  const status = searchParams.get('status')

  let query = db.from('zdr_engagements')
    .select(`
      id, zi_code, engagement_type, title, from_city, to_city,
      start_date, end_date, offered_rate_paise, rate_type, advance_paise,
      status, started_at, completed_at, actual_km, created_at,
      hirer:zi_entities!zdr_engagements_hirer_entity_id_fkey ( id, name ),
      driver:zi_entities!zdr_engagements_driver_entity_id_fkey ( id, name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'hirer') {
    query = query.eq('hirer_entity_id', entityId)
  } else if (role === 'driver') {
    query = query.eq('driver_entity_id', entityId)
  } else {
    query = query.or(`hirer_entity_id.eq.${entityId},driver_entity_id.eq.${entityId}`)
  }

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load engagements', error)
  return ok({ engagements: data ?? [], total: count ?? 0, page, limit })
})
