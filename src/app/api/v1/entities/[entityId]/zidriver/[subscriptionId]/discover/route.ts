// GET /api/v1/entities/:entityId/zidriver/:subscriptionId/discover
// Search the driver marketplace — used by ZiFleet operators, ZiLoad transporters,
// and any entity looking to hire a self-employed driver.
// Filters: city, vehicle_type, available_from, available_until, min_exp, min_rating
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { paginated, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)

  const city           = searchParams.get('city')
  const vehicle_type   = searchParams.get('vehicle_type')
  const available_from = searchParams.get('available_from')
  const available_until = searchParams.get('available_until')
  const min_exp        = searchParams.get('min_exp')      // minimum years experience
  const min_rating     = searchParams.get('min_rating')   // minimum avg_rating
  const verified_only  = searchParams.get('verified') === 'true'

  // Join availability slots to driver profiles so hirer sees drivers who are actually posted
  let query = db.from('zdr_availability')
    .select(`
      id, from_city, to_city, available_from, available_until,
      vehicle_type_pref, rate_paise, rate_type, notes,
      zdr_profiles!zdr_availability_driver_entity_id_fkey (
        zi_code, entity_id, full_name, photo_url, home_city, home_state,
        experience_years, vehicle_types, preferred_routes, languages, about,
        license_type, license_expiry, avg_rating, total_trips, total_ratings, total_km_driven,
        is_verified, availability_status
      )
    `, { count: 'exact' })
    .eq('status', 'POSTED')
    .order('zdr_profiles(avg_rating)', { ascending: false })
    .range(offset, offset + limit - 1)

  if (city)           query = query.ilike('from_city', `%${city}%`)
  if (vehicle_type)   query = query.eq('vehicle_type_pref', vehicle_type)
  if (available_from) query = query.gte('available_from', available_from)
  if (available_until) query = query.lte(
    'available_until', available_until
  ).or('available_until.is.null')

  const { data, count, error } = await query
  if (error) return serverError('Failed to search driver board', error)

  // Client-side filter for profile fields not filterable at query level
  let results = data ?? []
  if (min_exp)    results = results.filter((r: any) =>
    (r.zdr_profiles?.experience_years ?? 0) >= Number(min_exp))
  if (min_rating) results = results.filter((r: any) =>
    (r.zdr_profiles?.avg_rating ?? 0) >= Number(min_rating))
  if (verified_only) results = results.filter((r: any) =>
    r.zdr_profiles?.is_verified === true)

  return paginated(results, { page, limit, total: count ?? 0 })
})
