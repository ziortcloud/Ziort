// GET  /api/v1/entities/:entityId/ziload/:subscriptionId/rate-cards
// POST /api/v1/entities/:entityId/ziload/:subscriptionId/rate-cards
// Transporter-defined lane rates; shippers use them for indicative pricing
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateRateCardSchema } from '@/ziload/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const origin       = searchParams.get('origin')
  const dest         = searchParams.get('dest')
  const vehicleType  = searchParams.get('vehicle_type')
  const mine         = searchParams.get('mine') === 'true'

  let query = db.from('zld_rate_cards')
    .select(`
      id, origin_city, dest_city, vehicle_type, rate_per_ton,
      min_weight_tons, max_weight_tons, effective_from, effective_to,
      is_active, created_at,
      zld_profiles!zld_rate_cards_entity_id_fkey ( company_name, city, avg_rating, verified )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (mine) {
    query = query.eq('entity_id', entityId)
  }

  if (origin)      query = query.ilike('origin_city', `%${origin}%`)
  if (dest)        query = query.ilike('dest_city', `%${dest}%`)
  if (vehicleType) query = query.eq('vehicle_type', vehicleType)

  const { data, error } = await query
  if (error) return serverError('Failed to load rate cards', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zld_profiles')
    .select('id,role').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Complete your ZiLoad profile before creating rate cards')
  if (profile.role === 'shipper') return conflict('Shippers cannot create rate cards')

  const parsed = CreateRateCardSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: card, error } = await db.from('zld_rate_cards').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
    is_active:       true,
  }).select().single()

  if (error || !card) return serverError('Failed to create rate card', error)

  await writeAudit({ action: 'CREATE', table_name: 'zld_rate_cards', record_id: card.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { origin_city: parsed.data.origin_city, dest_city: parsed.data.dest_city, rate_per_ton: parsed.data.rate_per_ton },
    ...extractRequestMeta(req) })

  return created(card)
})
