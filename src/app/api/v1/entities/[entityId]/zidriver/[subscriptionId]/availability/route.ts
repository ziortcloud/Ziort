// GET  /api/v1/entities/:entityId/zidriver/:subscriptionId/availability
// POST /api/v1/entities/:entityId/zidriver/:subscriptionId/availability
// GET  — own posted slots
// POST — post an availability window (makes driver discoverable on board)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { PostAvailabilitySchema } from '@/zidriver/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'POSTED'

  let query = db.from('zdr_availability')
    .select('*')
    .eq('driver_entity_id', entityId)
    .order('available_from', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return serverError('Failed to load availability slots', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zdr_profiles')
    .select('id,is_active').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Create your ZiDriver profile before posting availability')
  if (!profile.is_active) return conflict('Driver profile is inactive')

  const parsed = PostAvailabilitySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Block overlapping POSTED slots for same driver
  const { data: overlap } = await db.from('zdr_availability')
    .select('id')
    .eq('driver_entity_id', entityId)
    .eq('status', 'POSTED')
    .lte('available_from', parsed.data.available_until ?? '9999-12-31')
    .gte('available_until', parsed.data.available_from)
    .maybeSingle()
  if (overlap) return conflict('You already have an active availability slot overlapping these dates')

  const { data: slot, error } = await db.from('zdr_availability').insert({
    ...parsed.data,
    driver_entity_id: entityId,
    subscription_id:  subscriptionId,
  }).select().single()

  if (error || !slot) return serverError('Failed to post availability', error)

  // Keep driver profile status in sync
  await db.from('zdr_profiles')
    .update({ availability_status: 'AVAILABLE', updated_at: new Date().toISOString() })
    .eq('entity_id', entityId)

  return created(slot)
})
