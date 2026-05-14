// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/enquiries/:enquiryId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/enquiries/:enquiryId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateEnquiryStageSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, enquiryId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: enquiry, error } = await db.from('zipulse_enquiries')
    .select(
      '*, ' +
      'zipulse_contacts!contact_id ( id, name, company_name, mobile_last4, pulse_score, city ), ' +
      'zi_individuals!assigned_to ( id, display_name ), ' +
      'zi_individuals!created_by ( id, display_name )'
    )
    .eq('id', enquiryId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !enquiry) return notFound('Enquiry')

  // Load associated threads (last 10)
  const { data: threads } = await db.from('zipulse_threads')
    .select('id, entry_type, content, created_at, zi_individuals!created_by ( id, display_name )')
    .eq('enquiry_id', enquiryId).order('created_at', { ascending: false }).limit(10)

  // Load open promises for this enquiry
  const { data: promises } = await db.from('zipulse_promises')
    .select('id, promise_type, direction, description, due_at, is_broken')
    .eq('enquiry_id', enquiryId).eq('is_fulfilled', false)
    .order('due_at', { ascending: true })

  // Load pending follow-ups
  const { data: followups } = await db.from('zipulse_followups')
    .select('id, channel, scheduled_at, agenda, status')
    .eq('enquiry_id', enquiryId).eq('status', 'pending')
    .order('scheduled_at', { ascending: true })

  return ok({ enquiry, threads: threads ?? [], promises: promises ?? [], followups: followups ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, enquiryId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: enquiry } = await db.from('zipulse_enquiries')
    .select('id, ref_code, contact_id, stage, stage_history').eq('id', enquiryId).eq('entity_id', entityId).single()
  if (!enquiry) return notFound('Enquiry')

  const parsed = UpdateEnquiryStageSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { stage, note, won_value, lost_reason, lost_to } = parsed.data
  const now = new Date().toISOString()

  // Append to stage history
  const history = Array.isArray(enquiry.stage_history) ? enquiry.stage_history : []
  history.push({ stage, changed_at: now, changed_by: session.individual.id, note: note ?? null })

  const updateData: Record<string, unknown> = {
    stage, stage_history: JSON.stringify(history), stage_updated_at: now, updated_at: now,
  }

  if (stage === 'won') {
    updateData.won_at    = now
    updateData.won_value = won_value ?? null
    // DB trigger fn_zpulse_on_enquiry_won handles won_enquiries + total_won_value_paise automatically
  }

  if (stage === 'lost') {
    updateData.lost_at     = now
    updateData.lost_reason = lost_reason ?? null
    updateData.lost_to     = lost_to ?? null
  }

  const { data: updated, error } = await db.from('zipulse_enquiries')
    .update(updateData).eq('id', enquiryId).select().single()
  if (error || !updated) return serverError('Failed to update enquiry stage', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zipulse_enquiries', record_id: enquiryId,
    ref_code: enquiry.ref_code, entity_id: entityId, individual_id: session.individual.id,
    old_value: { stage: enquiry.stage }, new_value: { stage }, ...extractRequestMeta(req) })

  return ok(updated)
})
