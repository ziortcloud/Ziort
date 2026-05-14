// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/meetings/:meetingId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/meetings/:meetingId
import { z } from 'zod'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CompleteMeetingSchema } from '@/zipulse/validators'

const PatchMeetingSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete'), ...CompleteMeetingSchema.shape }),
  z.object({ action: z.literal('cancel'),   reason: z.string().max(255).optional() }),
  z.object({ action: z.literal('reschedule'), scheduled_at: z.string().datetime() }),
])

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, meetingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: meeting, error } = await db.from('zipulse_meetings')
    .select(
      '*, ' +
      'zipulse_contacts!contact_id ( id, name, company_name, mobile_last4 ), ' +
      'zipulse_enquiries!enquiry_id ( id, zi_code, title, stage ), ' +
      'zi_individuals!created_by ( id, display_name )'
    )
    .eq('id', meetingId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !meeting) return notFound('Meeting')
  return ok(meeting)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, meetingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: meeting } = await db.from('zipulse_meetings')
    .select('id, ref_code, contact_id, status, title')
    .eq('id', meetingId).eq('entity_id', entityId).single()
  if (!meeting) return notFound('Meeting')

  const parsed = PatchMeetingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()
  let updateData: Record<string, unknown>
  let threadContent: string

  if (parsed.data.action === 'complete') {
    const { outcome, action_items, next_step } = parsed.data
    updateData = {
      status: 'completed', completed_at: now,
      outcome, action_items: JSON.stringify(action_items ?? []),
      next_step: next_step ?? null,
    }
    threadContent = `Meeting completed: ${meeting.title}. ${outcome}`
  } else if (parsed.data.action === 'cancel') {
    updateData = { status: 'cancelled', outcome: parsed.data.reason ?? null }
    threadContent = `Meeting cancelled: ${meeting.title}`
  } else {
    updateData = { status: 'rescheduled', scheduled_at: parsed.data.scheduled_at }
    threadContent = `Meeting rescheduled: ${meeting.title} → ${parsed.data.scheduled_at}`
  }
  updateData.updated_at = now

  const { data: updated, error } = await db.from('zipulse_meetings')
    .update(updateData).eq('id', meetingId).select().single()
  if (error || !updated) return serverError('Failed to update meeting', error)

  // Update contact last_contact_at on completion
  if (parsed.data.action === 'complete') {
    await db.from('zipulse_contacts').update({ last_contact_at: now, updated_at: now })
      .eq('id', meeting.contact_id)

    // Add thread entry for completion
    await db.from('zipulse_threads').insert({
      zi_code: `MTG-DONE-${meetingId.slice(0, 8)}`, ref_code: `DONE-${meeting.ref_code}`,
      entity_id: entityId, subscription_id: subscriptionId,
      contact_id: meeting.contact_id, entry_type: 'meeting',
      content: threadContent, meeting_id: meetingId,
      is_private: false, created_by: session.individual.id,
    })
  }

  await writeAudit({ action: 'UPDATE', table_name: 'zipulse_meetings', record_id: meetingId,
    ref_code: meeting.ref_code, entity_id: entityId, individual_id: session.individual.id,
    old_value: { status: meeting.status }, new_value: { action: parsed.data.action }, ...extractRequestMeta(req) })

  return ok(updated)
})
