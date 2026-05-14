// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/enquiries
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/enquiries
// GET returns pipeline view — filterable by stage, assignee, contact
import { z } from 'zod'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextEnquiryCode, enquiryRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, paginated, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateEnquirySchema } from '@/zipulse/validators'

// Extend CreateEnquirySchema to include contact_id (required for POST)
const CreateEnquiryBodySchema = CreateEnquirySchema.extend({
  contact_id: z.string().uuid(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const stage      = searchParams.get('stage')
  const contactId  = searchParams.get('contact_id')
  const assignedTo = searchParams.get('assigned_to')
  const archived   = searchParams.get('archived') === 'true'
  const sortBy     = searchParams.get('sort') ?? 'stage_updated_at'

  let query = db.from('zipulse_enquiries')
    .select(
      'id, zi_code, ref_code, contact_id, title, category, product_interest, ' +
      'value, currency, probability, stage, stage_updated_at, expected_close, ' +
      'won_at, won_value, lost_at, lost_reason, total_threads, total_followups, ' +
      'is_archived, created_at, assigned_to, ' +
      'zipulse_contacts!contact_id ( id, name, company_name, mobile_last4, pulse_score )',
      { count: 'exact' }
    )
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .eq('is_archived', archived)
    .range(offset, offset + limit - 1)

  if (sortBy === 'value')               query = query.order('value', { ascending: false })
  else if (sortBy === 'expected_close') query = query.order('expected_close', { ascending: true })
  else                                  query = query.order('stage_updated_at', { ascending: false })

  if (stage)      query = query.eq('stage', stage)
  if (contactId)  query = query.eq('contact_id', contactId)
  if (assignedTo) query = query.eq('assigned_to', assignedTo)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load enquiries', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateEnquiryBodySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { contact_id, title, description, category, product_interest, value, currency,
    probability, source, expected_close, assigned_to } = parsed.data

  const { data: contact } = await db.from('zipulse_contacts')
    .select('id, zi_code').eq('id', contact_id).eq('subscription_id', subscriptionId).single()
  if (!contact) return notFound('Contact')

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const enq_code  = await nextEnquiryCode()
  const ref_code  = enquiryRefCode(entity_zi, sub.zi_code, enq_code)

  const { data: enquiry, error } = await db.from('zipulse_enquiries').insert({
    zi_code: enq_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    contact_id: contact_id,
    assigned_to: assigned_to ?? session.individual.id,
    title, description: description ?? null,
    category: category ?? null, product_interest: product_interest ?? null,
    value: value ?? 0, currency: currency ?? 'INR',
    probability: probability ?? 50, source: source ?? null,
    expected_close: expected_close ?? null,
    stage_history: JSON.stringify([{
      stage: 'new', changed_at: new Date().toISOString(),
      changed_by: session.individual.id, note: 'Enquiry created',
    }]),
    created_by: session.individual.id,
  }).select().single()

  if (error || !enquiry) return serverError('Failed to create enquiry', error)

  // DB trigger fn_zpulse_on_enquiry_insert handles total_enquiries automatically

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_enquiries', record_id: enquiry.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { enq_code, title, stage: 'new' }, ...extractRequestMeta(req) })

  return created(enquiry)
})
