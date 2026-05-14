// GET /api/v1/entities/:entityId/ziload/:subscriptionId/bookings
// Returns bookings where this entity is either the shipper or the transporter
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { paginated, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const role   = searchParams.get('role')   // 'shipper' | 'transporter'
  const status = searchParams.get('status')

  let query = db.from('zld_bookings')
    .select(`
      id, zi_code, status, freight_paise, advance_paise, payment_status,
      lr_number, lr_url, pod_url, tracking_token,
      created_at, updated_at,
      zld_loads ( id, zi_code, origin_city, dest_city, pickup_date, material_type, weight_tons ),
      shipper:zld_profiles!zld_bookings_shipper_entity_id_fkey ( company_name, city, avg_rating ),
      transporter:zld_profiles!zld_bookings_transporter_entity_id_fkey ( company_name, city, avg_rating, verified ),
      zld_trucks ( vehicle_type, capacity_tons, reg_number, current_city )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'shipper') {
    query = query.eq('shipper_entity_id', entityId)
  } else if (role === 'transporter') {
    query = query.eq('transporter_entity_id', entityId)
  } else {
    // Both sides visible — entity appears in either column
    query = query.or(`shipper_entity_id.eq.${entityId},transporter_entity_id.eq.${entityId}`)
  }

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load bookings', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})
