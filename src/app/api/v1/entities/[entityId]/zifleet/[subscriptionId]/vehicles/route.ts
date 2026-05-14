// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateVehicleSchema } from '@/zifleet/validators'
import { nextVehicleCode } from '@/zifleet/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const type       = searchParams.get('type')
  const activeOnly = searchParams.get('active') !== 'false'

  let query = db.from('zft_vehicles')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (activeOnly) query = query.eq('is_active', true)
  if (status)     query = query.eq('status', status)
  if (type)       query = query.eq('vehicle_type', type)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load vehicles', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateVehicleSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: dup } = await db.from('zft_vehicles')
    .select('id,zi_code').eq('entity_id', entityId).eq('reg_number', parsed.data.reg_number).maybeSingle()
  if (dup) return conflict(`Vehicle ${parsed.data.reg_number} already registered (${dup.zi_code})`)

  const zi_code = await nextVehicleCode()

  const { data: vehicle, error } = await db.from('zft_vehicles').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !vehicle) return serverError('Failed to register vehicle', error)

  await writeAudit({ action: 'CREATE', table_name: 'zft_vehicles', record_id: vehicle.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, reg_number: parsed.data.reg_number, vehicle_type: parsed.data.vehicle_type },
    ...extractRequestMeta(req) })

  return created(vehicle)
})
