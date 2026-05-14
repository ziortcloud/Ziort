// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/maintenance
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/maintenance
// Cross-vehicle maintenance view — POST also usable here (vehicle_id required in body)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { LogMaintenanceSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const vehicleId   = searchParams.get('vehicle_id')
  const serviceType = searchParams.get('service_type')
  const from        = searchParams.get('from')
  const to          = searchParams.get('to')

  let query = db.from('zft_maintenance_logs')
    .select(`
      *,
      zft_vehicles ( id, zi_code, reg_number, vehicle_type )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('service_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (vehicleId)   query = query.eq('vehicle_id', vehicleId)
  if (serviceType) query = query.eq('service_type', serviceType)
  if (from)        query = query.gte('service_date', from)
  if (to)          query = query.lte('service_date', to)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load maintenance logs', error)

  return ok({ logs: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = LogMaintenanceSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: vehicle } = await db.from('zft_vehicles')
    .select('id,status,total_expense_paise').eq('id', parsed.data.vehicle_id).eq('entity_id', entityId).single()
  if (!vehicle) return notFound('Vehicle')
  if (vehicle.status === 'ON_TRIP') return conflict('Cannot log maintenance — vehicle is on a trip')

  const { data: log, error } = await db.from('zft_maintenance_logs').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    logged_by:       session.individual.id,
  }).select().single()

  if (error || !log) return serverError('Failed to log maintenance', error)

  const vehicleUpdates: Record<string, unknown> = {
    total_expense_paise: (vehicle.total_expense_paise ?? 0) + parsed.data.amount_paise,
    updated_at: new Date().toISOString(),
  }
  if (vehicle.status === 'AVAILABLE') vehicleUpdates.status = 'MAINTENANCE'

  await db.from('zft_vehicles').update(vehicleUpdates).eq('id', parsed.data.vehicle_id)

  await writeAudit({ action: 'CREATE', table_name: 'zft_maintenance_logs', record_id: log.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { vehicle_id: parsed.data.vehicle_id, service_type: parsed.data.service_type, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(log)
})
