// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateContactSchema } from '@/zipulse/validators'
import { calculatePulseScore, scoreToPulseStatus } from '@/zipulse/services/pulse-score'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: contact, error } = await db.from('zipulse_contacts')
    .select('*').eq('id', contactId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !contact) return notFound('Contact')

  // Live pulse score (recalculate on each view)
  const score = calculatePulseScore({
    last_contact_at:  contact.last_contact_at ? new Date(contact.last_contact_at) : null,
    broken_promises:  contact.broken_promises,
    total_promises:   contact.total_promises,
    missed_followups: contact.missed_followups,
    total_followups:  contact.total_followups,
    enquiry_stage:    null,
    total_enquiries:  contact.total_enquiries,
  })
  const pulse_status = scoreToPulseStatus(score)

  // Active enquiries
  const { data: enquiries } = await db.from('zipulse_enquiries')
    .select('id, zi_code, title, stage, value, currency, expected_close, stage_updated_at')
    .eq('contact_id', contactId).eq('is_archived', false)
    .order('created_at', { ascending: false }).limit(5)

  // Pending follow-ups
  const { data: followups } = await db.from('zipulse_followups')
    .select('id, channel, scheduled_at, agenda, status')
    .eq('contact_id', contactId).eq('status', 'pending')
    .order('scheduled_at', { ascending: true }).limit(3)

  // Open promises
  const { data: promises } = await db.from('zipulse_promises')
    .select('id, zi_code, promise_type, direction, description, due_at, is_broken')
    .eq('contact_id', contactId).eq('is_fulfilled', false)
    .order('due_at', { ascending: true }).limit(5)

  // Score history for trend
  const { data: scoreHistory } = await db.from('zipulse_score_history')
    .select('score, status, recorded_at')
    .eq('contact_id', contactId)
    .order('recorded_at', { ascending: false }).limit(10)

  return ok({
    ...contact,
    pulse_score:   score,
    pulse_status,
    enquiries:     enquiries ?? [],
    followups:     followups ?? [],
    promises:      promises ?? [],
    score_history: scoreHistory ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpdateContactSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const updateData: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
  if (parsed.data.is_archived) updateData.archived_at = new Date().toISOString()

  const { data: contact, error } = await db.from('zipulse_contacts')
    .update(updateData).eq('id', contactId).eq('entity_id', entityId).select().single()

  if (error || !contact) return serverError('Failed to update contact', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zipulse_contacts', record_id: contactId,
    ref_code: contact.ref_code, entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })
  return ok(contact)
})
