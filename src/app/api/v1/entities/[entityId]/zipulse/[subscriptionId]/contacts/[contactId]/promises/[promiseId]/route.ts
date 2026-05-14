// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/promises/:promiseId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/promises/:promiseId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { FulfillPromiseSchema, BreakPromiseSchema } from '@/zipulse/validators'
import { z } from 'zod'

const PatchPromiseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('fulfill'), ...FulfillPromiseSchema.shape }),
  z.object({ action: z.literal('break'),   ...BreakPromiseSchema.shape }),
])

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId, promiseId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: promise, error } = await db.from('zipulse_promises')
    .select('*, zi_individuals!created_by ( id, display_name )')
    .eq('id', promiseId).eq('contact_id', contactId).eq('entity_id', entityId).single()
  if (error || !promise) return notFound('Promise')
  return ok(promise)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId, promiseId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: promise } = await db.from('zipulse_promises')
    .select('id, ref_code, contact_id, is_fulfilled, is_broken')
    .eq('id', promiseId).eq('contact_id', contactId).single()
  if (!promise) return notFound('Promise')

  const parsed = PatchPromiseSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()
  let updateData: Record<string, unknown>

  if (parsed.data.action === 'fulfill') {
    updateData = {
      is_fulfilled: true,
      fulfilled_at: now,
      fulfillment_note: parsed.data.fulfillment_note ?? null,
    }
  } else {
    updateData = {
      is_broken: true,
      broken_reason: parsed.data.broken_reason ?? null,
    }
  }

  const { data: updated, error } = await db.from('zipulse_promises')
    .update(updateData).eq('id', promiseId).select().single()
  if (error || !updated) return serverError('Failed to update promise', error)

  // DB trigger fn_zpulse_on_promise_break handles broken_promises increment automatically

  await writeAudit({ action: 'UPDATE', table_name: 'zipulse_promises', record_id: promiseId,
    ref_code: promise.ref_code, entity_id: entityId, individual_id: session.individual.id,
    new_value: { action: parsed.data.action }, ...extractRequestMeta(req) })

  return ok(updated)
})
