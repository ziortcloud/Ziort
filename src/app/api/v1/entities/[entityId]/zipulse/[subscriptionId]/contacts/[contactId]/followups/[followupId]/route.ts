// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/followups/:followupId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/followups/:followupId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextFollowupCode, followupRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CompleteFollowupSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId, followupId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: followup, error } = await db.from('zipulse_followups')
    .select('*, zi_individuals!assigned_to ( id, display_name ), zi_individuals!created_by ( id, display_name )')
    .eq('id', followupId).eq('contact_id', contactId).eq('entity_id', entityId).single()
  if (error || !followup) return notFound('Follow-up')
  return ok(followup)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId, followupId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const { data: followup } = await db.from('zipulse_followups')
    .select('id, ref_code, contact_id, zi_code, is_recurring, recurrence_type, enquiry_id, channel')
    .eq('id', followupId).eq('contact_id', contactId).single()
  if (!followup) return notFound('Follow-up')

  const parsed = CompleteFollowupSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { outcome, outcome_notes, next_followup_at } = parsed.data
  const now = new Date().toISOString()

  const isMissed = outcome === 'no_answer'
  const status   = outcome === 'rescheduled' ? 'rescheduled' : 'done'

  const { data: updated, error } = await db.from('zipulse_followups')
    .update({
      status, outcome, outcome_notes: outcome_notes ?? null,
      completed_at: now,
      next_followup_at: next_followup_at ?? null,
    }).eq('id', followupId).select().single()
  if (error || !updated) return serverError('Failed to complete follow-up', error)

  // Update contact last_contact_at (trigger handles missed_followups automatically)
  await db.from('zipulse_contacts').update({
    last_contact_at: now, updated_at: now,
  }).eq('id', contactId)

  // If rescheduled or has next_followup_at, create a new followup automatically
  if (next_followup_at && (status === 'rescheduled' || followup.is_recurring)) {
    const { data: contact } = await db.from('zipulse_contacts')
      .select('zi_code').eq('id', contactId).single()
    const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
    const fup_code  = await nextFollowupCode()
    const ref_code  = followupRefCode(entity_zi, sub.zi_code, contact?.zi_code ?? '', fup_code)

    await db.from('zipulse_followups').insert({
      zi_code: fup_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
      contact_id: contactId, enquiry_id: followup.enquiry_id ?? null,
      assigned_to: session.individual.id, channel: followup.channel,
      scheduled_at: next_followup_at,
      is_recurring: followup.is_recurring ?? false,
      recurrence_type: followup.recurrence_type ?? null,
      parent_followup: followupId,
      created_by: session.individual.id,
    })

    // Update contact next followup pointer
    await db.from('zipulse_contacts').update({
      next_followup_at, next_followup_channel: followup.channel, updated_at: now,
    }).eq('id', contactId)
  }

  await writeAudit({ action: 'UPDATE', table_name: 'zipulse_followups', record_id: followupId,
    ref_code: followup.ref_code, entity_id: entityId, individual_id: session.individual.id,
    new_value: { status, outcome }, ...extractRequestMeta(req) })

  return ok(updated)
})
