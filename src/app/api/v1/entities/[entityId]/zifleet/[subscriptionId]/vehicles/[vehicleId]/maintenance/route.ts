// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles/:vehicleId/maintenance
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles/:vehicleId/maintenance
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { LogMaintenanceSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, vehicleId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: vehicle } = await db.from('zft_vehicles')
    .select('id').eq('id', vehicleId).eq('entity_id', entityId).single()
  if (!vehicle) return notFound('Vehicle')

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const serviceType = searchParams.get('service_type')

  let query = db.from('zft_maintenance_logs')
    .select('*', { count: 'exact' })
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (serviceType) query = query.eq('service_type', serviceType)

  const { data: logs, count, error } = await query
  if (error) return serverError('Failed to load maintenance logs', error)
  return ok({ logs: logs ?? [], total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, vehicleId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: vehicle } = await db.from('zft_vehicles')
    .select('id,status,total_expense_paise').eq('id', vehicleId).eq('entity_id', entityId).single()
  if (!vehicle) return notFound('Vehicle')

  const parsed = LogMaintenanceSchema.safeParse({ ...await req.json(), vehicle_id: vehicleId })
  if (!parsed.success) return validationError(parsed.error)

  const { data: log, error } = await db.from('zft_maintenance_logs').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    logged_by:       session.individual.id,
  }).select().single()

  if (error || !log) return serverError('Failed to log maintenance', error)

  // Accumulate maintenance cost onto vehicle
  const vehicleUpdates: Record<string, unknown> = {
    total_expense_paise: (vehicle.total_expense_paise ?? 0) + parsed.data.amount_paise,
    updated_at: new Date().toISOString(),
  }
  // Auto-set vehicle to MAINTENANCE status when an active service is logged
  if (vehicle.status === 'AVAILABLE') vehicleUpdates.status = 'MAINTENANCE'

  await db.from('zft_vehicles').update(vehicleUpdates).eq('id', vehicleId)

  await writeAudit({ action: 'CREATE', table_name: 'zft_maintenance_logs', record_id: log.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { service_type: parsed.data.service_type, amount_paise: parsed.data.amount_paise, service_date: parsed.data.service_date },
    ...extractRequestMeta(req) })

  return created(log)
})
