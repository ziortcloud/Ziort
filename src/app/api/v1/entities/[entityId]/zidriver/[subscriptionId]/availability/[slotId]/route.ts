// GET    /api/v1/entities/:entityId/zidriver/:subscriptionId/availability/:slotId
// PATCH  /api/v1/entities/:entityId/zidriver/:subscriptionId/availability/:slotId
// DELETE /api/v1/entities/:entityId/zidriver/:subscriptionId/availability/:slotId (withdraw)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateAvailabilitySchema } from '@/zidriver/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, slotId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: slot, error } = await db.from('zdr_availability')
    .select('*').eq('id', slotId).single()
  if (error || !slot) return notFound('Availability slot')
  return ok(slot)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, slotId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: slot } = await db.from('zdr_availability')
    .select('id,status,driver_entity_id').eq('id', slotId).single()
  if (!slot) return notFound('Availability slot')
  if (slot.driver_entity_id !== entityId) return conflict('Cannot modify another driver\'s slot')
  if (slot.status === 'BOOKED') return conflict('Cannot modify a booked availability slot')

  const parsed = UpdateAvailabilitySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zdr_availability')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', slotId).select().single()

  if (error || !updated) return serverError('Failed to update availability slot', error)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, slotId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: slot } = await db.from('zdr_availability')
    .select('id,status,driver_entity_id').eq('id', slotId).single()
  if (!slot) return notFound('Availability slot')
  if (slot.driver_entity_id !== entityId) return conflict('Cannot withdraw another driver\'s slot')
  if (slot.status === 'BOOKED') return conflict('Cannot withdraw a booked slot')

  const { error } = await db.from('zdr_availability')
    .update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() }).eq('id', slotId)
  if (error) return serverError('Failed to withdraw availability', error)

  // If no other POSTED slots remain, set driver to INACTIVE
  const { count } = await db.from('zdr_availability')
    .select('id', { count: 'exact', head: true })
    .eq('driver_entity_id', entityId).eq('status', 'POSTED')

  if ((count ?? 0) === 0) {
    await db.from('zdr_profiles')
      .update({ availability_status: 'INACTIVE', updated_at: new Date().toISOString() })
      .eq('entity_id', entityId)
  }

  return ok({ withdrawn: true, id: slotId })
})
