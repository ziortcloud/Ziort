// GET    /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles/:vehicleId
// PATCH  /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles/:vehicleId
// DELETE /api/v1/entities/:entityId/zifleet/:subscriptionId/vehicles/:vehicleId (soft)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateVehicleSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, vehicleId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: vehicle, error } = await db.from('zft_vehicles')
    .select('*').eq('id', vehicleId).eq('entity_id', entityId).single()
  if (error || !vehicle) return notFound('Vehicle')

  // Recent trips
  const { data: recentTrips } = await db.from('zft_trips')
    .select('id,zi_code,origin,destination,status,started_at,closed_at,freight_paise')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Upcoming maintenance
  const { data: nextMaint } = await db.from('zft_maintenance_logs')
    .select('service_type,service_date,next_service_date,next_service_km')
    .eq('vehicle_id', vehicleId)
    .not('next_service_date', 'is', null)
    .order('service_date', { ascending: false })
    .limit(1)

  return ok({ ...vehicle, recent_trips: recentTrips ?? [], next_maintenance: nextMaint?.[0] ?? null })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, vehicleId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zft_vehicles')
    .select('id,status').eq('id', vehicleId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Vehicle')

  const parsed = UpdateVehicleSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Cannot manually change status to ON_TRIP (system-managed)
  if (parsed.data.status === 'ON_TRIP' as any) return conflict('ON_TRIP status is system-managed')
  if (existing.status === 'ON_TRIP' && parsed.data.status)
    return conflict('Cannot change status of a vehicle currently on a trip')

  const { data: vehicle, error } = await db.from('zft_vehicles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', vehicleId).select().single()

  if (error || !vehicle) return serverError('Failed to update vehicle', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zft_vehicles', record_id: vehicleId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(vehicle)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, vehicleId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: vehicle } = await db.from('zft_vehicles')
    .select('id,status').eq('id', vehicleId).eq('entity_id', entityId).single()
  if (!vehicle) return notFound('Vehicle')
  if (vehicle.status === 'ON_TRIP') return conflict('Cannot deactivate vehicle currently on a trip')

  await db.from('zft_vehicles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', vehicleId)

  await writeAudit({ action: 'UPDATE', table_name: 'zft_vehicles', record_id: vehicleId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_active: false }, ...extractRequestMeta(req) })

  return ok({ deactivated: true, id: vehicleId })
})
