// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts
// GET returns Pulse Board list — sortable by score, filterable by status
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextContactCode, contactRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateContactSchema } from '@/zipulse/validators'

const hashMobile = (m: string) => crypto.createHash('sha256').update(m).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const search      = searchParams.get('search') ?? ''
  const pulseStatus = searchParams.get('pulse_status')   // hot|warm|cool|silent|lost|closed
  const assignedTo  = searchParams.get('assigned_to')
  const source      = searchParams.get('source')
  const sortBy      = searchParams.get('sort') ?? 'pulse_score'  // pulse_score|last_contact_at|created_at

  let query = db.from('zipulse_contacts')
    .select('id, zi_code, ref_code, name, company_name, mobile_last4, city, source, ' +
            'pulse_score, pulse_status, last_contact_at, next_followup_at, next_followup_channel, ' +
            'total_enquiries, won_enquiries, total_won_value_paise, is_archived, created_at',
            { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .eq('is_archived', false)
    .range(offset, offset + limit - 1)

  if (sortBy === 'pulse_score')      query = query.order('pulse_score', { ascending: false })
  else if (sortBy === 'last_contact') query = query.order('last_contact_at', { ascending: false })
  else                               query = query.order('created_at', { ascending: false })

  if (search)      query = query.or(`name.ilike.%${search}%,mobile_last4.eq.${search},company_name.ilike.%${search}%`)
  if (pulseStatus) query = query.eq('pulse_status', pulseStatus)
  if (assignedTo)  query = query.eq('assigned_to', assignedTo)
  if (source)      query = query.eq('source', source)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load contacts', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateContactSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { name, mobile, company_name, designation, email, address, city, source,
    source_ref_code, referred_by_contact, next_followup_at, next_followup_channel,
    branch_id, assigned_to } = parsed.data

  const mobile_hash  = hashMobile(mobile)
  const mobile_last4 = mobile.slice(-4)

  // Duplicate check within subscription
  const { data: existing } = await db.from('zipulse_contacts')
    .select('id, zi_code, name').eq('subscription_id', subscriptionId)
    .eq('mobile_hash', mobile_hash).eq('is_archived', false).maybeSingle()
  if (existing) return conflict(`Contact already exists: ${existing.name} (${existing.zi_code})`)

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const cst_code  = await nextContactCode()
  const ref_code  = contactRefCode(entity_zi, sub.zi_code, cst_code)

  const { data: contact, error } = await db.from('zipulse_contacts').insert({
    zi_code: cst_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    branch_id: branch_id ?? null, assigned_to: assigned_to ?? session.individual.id,
    name, mobile_hash, mobile_last4,
    company_name: company_name ?? null, designation: designation ?? null,
    email: email ?? null, address: address ?? null, city: city ?? null,
    source: source ?? 'manual', source_ref_code: source_ref_code ?? null,
    referred_by_contact: referred_by_contact ?? null,
    next_followup_at: next_followup_at ?? null,
    next_followup_channel: next_followup_channel ?? null,
    // New contacts start at 70 — fresh relationship
    pulse_score: 70, pulse_status: 'warm',
    last_contact_at: new Date().toISOString(),
  }).select().single()

  if (error || !contact) return serverError('Failed to create contact', error)

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_contacts', record_id: contact.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: cst_code, name, mobile_last4, source }, ...extractRequestMeta(req) })

  return created(contact)
})
