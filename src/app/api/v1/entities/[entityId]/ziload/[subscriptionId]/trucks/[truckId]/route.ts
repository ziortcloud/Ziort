// GET    /api/v1/entities/:entityId/ziload/:subscriptionId/trucks/:truckId
// PATCH  /api/v1/entities/:entityId/ziload/:subscriptionId/trucks/:truckId
// DELETE /api/v1/entities/:entityId/ziload/:subscriptionId/trucks/:truckId (mark unavailable)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateTruckSchema } from '@/ziload/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, truckId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: truck, error } = await db.from('zld_trucks')
    .select(`
      *,
      zld_profiles!zld_trucks_entity_id_fkey ( company_name, city, state, avg_rating, verified )
    `)
    .eq('id', truckId).single()

  if (error || !truck) return notFound('Truck')
  return ok(truck)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, truckId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: truck } = await db.from('zld_trucks')
    .select('id,status,entity_id').eq('id', truckId).single()
  if (!truck) return notFound('Truck')
  if (truck.entity_id !== entityId) return conflict('Cannot modify another entity\'s truck posting')
  if (truck.status === 'BOOKED') return conflict('Cannot modify a booked truck — cancel the booking first')

  const parsed = UpdateTruckSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zld_trucks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', truckId).select().single()

  if (error || !updated) return serverError('Failed to update truck', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zld_trucks', record_id: truckId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, truckId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: truck } = await db.from('zld_trucks')
    .select('id,status,entity_id').eq('id', truckId).single()
  if (!truck) return notFound('Truck')
  if (truck.entity_id !== entityId) return conflict('Cannot remove another entity\'s truck posting')
  if (truck.status === 'BOOKED') return conflict('Truck is currently booked — cannot remove while active booking exists')

  const { error } = await db.from('zld_trucks')
    .update({ status: 'UNAVAILABLE', updated_at: new Date().toISOString() })
    .eq('id', truckId)

  if (error) return serverError('Failed to remove truck posting', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zld_trucks', record_id: truckId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'UNAVAILABLE' }, ...extractRequestMeta(req) })

  return ok({ removed: true, id: truckId })
})
