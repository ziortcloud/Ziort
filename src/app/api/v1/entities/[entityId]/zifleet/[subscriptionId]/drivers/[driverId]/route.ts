// GET    /api/v1/entities/:entityId/zifleet/:subscriptionId/drivers/:driverId
// PATCH  /api/v1/entities/:entityId/zifleet/:subscriptionId/drivers/:driverId
// DELETE /api/v1/entities/:entityId/zifleet/:subscriptionId/drivers/:driverId (soft)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateDriverSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, driverId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: driver, error } = await db.from('zft_drivers')
    .select('*').eq('id', driverId).eq('entity_id', entityId).single()
  if (error || !driver) return notFound('Driver')

  const { data: recentTrips } = await db.from('zft_trips')
    .select('id,zi_code,origin,destination,status,started_at,closed_at,freight_paise')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(5)

  return ok({ ...driver, recent_trips: recentTrips ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, driverId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: existing } = await db.from('zft_drivers')
    .select('id,status').eq('id', driverId).eq('entity_id', entityId).single()
  if (!existing) return notFound('Driver')
  if (existing.status === 'ON_TRIP') return conflict('Cannot modify driver currently on a trip')

  const parsed = UpdateDriverSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: driver, error } = await db.from('zft_drivers')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', driverId).select().single()

  if (error || !driver) return serverError('Failed to update driver', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zft_drivers', record_id: driverId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(driver)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, driverId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: driver } = await db.from('zft_drivers')
    .select('id,status').eq('id', driverId).eq('entity_id', entityId).single()
  if (!driver) return notFound('Driver')
  if (driver.status === 'ON_TRIP') return conflict('Cannot deactivate driver currently on a trip')

  await db.from('zft_drivers')
    .update({ is_active: false, status: 'INACTIVE', updated_at: new Date().toISOString() })
    .eq('id', driverId)

  await writeAudit({ action: 'UPDATE', table_name: 'zft_drivers', record_id: driverId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_active: false, status: 'INACTIVE' }, ...extractRequestMeta(req) })

  return ok({ deactivated: true, id: driverId })
})
