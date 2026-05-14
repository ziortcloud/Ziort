// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/meetings
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/meetings
import { z } from 'zod'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextMeetingCode, meetingRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, paginated, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateMeetingSchema } from '@/zipulse/validators'

const CreateMeetingBodySchema = CreateMeetingSchema.extend({
  contact_id: z.string().uuid(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contact_id')
  const status    = searchParams.get('status')    // scheduled|completed|cancelled|rescheduled
  const fromDate  = searchParams.get('from')
  const toDate    = searchParams.get('to')

  let query = db.from('zipulse_meetings')
    .select(
      'id, zi_code, ref_code, contact_id, enquiry_id, title, location, ' +
      'scheduled_at, duration_mins, status, completed_at, outcome, ' +
      'zipulse_contacts!contact_id ( id, name, company_name )',
      { count: 'exact' }
    )
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .order('scheduled_at', { ascending: false }).range(offset, offset + limit - 1)

  if (contactId) query = query.eq('contact_id', contactId)
  if (status)    query = query.eq('status', status)
  if (fromDate)  query = query.gte('scheduled_at', fromDate)
  if (toDate)    query = query.lte('scheduled_at', toDate)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load meetings', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateMeetingBodySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { contact_id, title, scheduled_at, duration_mins, location, location_url,
    meeting_url, agenda, pre_notes, enquiry_id } = parsed.data

  const { data: contact } = await db.from('zipulse_contacts')
    .select('id, zi_code').eq('id', contact_id).eq('subscription_id', subscriptionId).single()
  if (!contact) return notFound('Contact')

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const mtg_code  = await nextMeetingCode()
  const ref_code  = meetingRefCode(entity_zi, sub.zi_code, mtg_code)

  const { data: meeting, error } = await db.from('zipulse_meetings').insert({
    zi_code: mtg_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    contact_id: contact_id, enquiry_id: enquiry_id ?? null,
    title, scheduled_at, duration_mins: duration_mins ?? 30,
    location: location ?? null, location_url: location_url ?? null,
    meeting_url: meeting_url ?? null, agenda: agenda ?? null,
    pre_notes: pre_notes ?? null,
    created_by: session.individual.id,
  }).select().single()

  if (error || !meeting) return serverError('Failed to schedule meeting', error)

  // Add a thread entry on the contact for the scheduled meeting
  await db.from('zipulse_threads').insert({
    zi_code: `MTG-${mtg_code}`, ref_code: `${ref_code}-THR`, entity_id: entityId,
    subscription_id: subscriptionId, contact_id: contact_id,
    entry_type: 'meeting', content: `Meeting scheduled: ${title}`,
    meeting_id: meeting.id, is_private: false, created_by: session.individual.id,
  })

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_meetings', record_id: meeting.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { mtg_code, title, scheduled_at }, ...extractRequestMeta(req) })

  return created(meeting)
})
