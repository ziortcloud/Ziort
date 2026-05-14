// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/followups
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/followups
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextFollowupCode, followupRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateFollowupSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')   // pending|done|missed|rescheduled|cancelled
  const channel    = searchParams.get('channel')
  const assignedTo = searchParams.get('assigned_to')

  let query = db.from('zipulse_followups')
    .select('*, zi_individuals!assigned_to ( id, display_name )', { count: 'exact' })
    .eq('contact_id', contactId).eq('entity_id', entityId)
    .order('scheduled_at', { ascending: true }).range(offset, offset + limit - 1)

  if (status)     query = query.eq('status', status)
  if (channel)    query = query.eq('channel', channel)
  if (assignedTo) query = query.eq('assigned_to', assignedTo)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load follow-ups', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const { data: contact } = await db.from('zipulse_contacts')
    .select('id, zi_code, ref_code').eq('id', contactId).eq('subscription_id', subscriptionId).single()
  if (!contact) return notFound('Contact')

  const parsed = CreateFollowupSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { channel, scheduled_at, reminder_at, agenda, enquiry_id,
    assigned_to, is_recurring, recurrence_type } = parsed.data

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const fup_code  = await nextFollowupCode()
  const ref_code  = followupRefCode(entity_zi, sub.zi_code, contact.zi_code, fup_code)

  const { data: followup, error } = await db.from('zipulse_followups').insert({
    zi_code: fup_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    contact_id: contactId, enquiry_id: enquiry_id ?? null,
    assigned_to: assigned_to ?? session.individual.id,
    channel, scheduled_at, reminder_at: reminder_at ?? null, agenda: agenda ?? null,
    is_recurring: is_recurring ?? false,
    recurrence_type: is_recurring ? (recurrence_type ?? null) : null,
    created_by: session.individual.id,
  }).select().single()

  if (error || !followup) return serverError('Failed to schedule follow-up', error)

  // Update contact's next_followup_at if this is sooner
  await db.from('zipulse_contacts').update({
    next_followup_at: scheduled_at,
    next_followup_channel: channel,
    updated_at: new Date().toISOString(),
  }).eq('id', contactId).lt('next_followup_at', scheduled_at)

  // Also set if contact has no next followup at all
  await db.from('zipulse_contacts').update({
    next_followup_at: scheduled_at,
    next_followup_channel: channel,
    updated_at: new Date().toISOString(),
  }).eq('id', contactId).is('next_followup_at', null)

  // DB trigger fn_zpulse_on_followup_insert handles total_followups automatically

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_followups', record_id: followup.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { fup_code, channel, scheduled_at }, ...extractRequestMeta(req) })

  return created(followup)
})
