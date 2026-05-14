// GET  /api/v1/entities/:entityId/zicare/:subscriptionId/enquiries
// POST /api/v1/entities/:entityId/zicare/:subscriptionId/enquiries
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextCareEnquiryCode, enquiryRefCode } from '@/zicare/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateCareEnquirySchema } from '@/zicare/validators'

const hashMobile = (m: string) => crypto.createHash('sha256').update(m).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const status = new URL(req.url).searchParams.get('status')

  let query = db.from('zcr_enquiries').select('*', { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load enquiries', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateCareEnquirySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { full_name, mobile, enquiry_text } = parsed.data
  const mobile_hash  = hashMobile(mobile)
  const mobile_last4 = mobile.slice(-4)

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const enq_code  = await nextCareEnquiryCode()
  const ref_code  = enquiryRefCode(entity_zi, sub.zi_code, enq_code)

  const { data: enquiry, error } = await db.from('zcr_enquiries').insert({
    zi_code: enq_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    full_name, mobile_hash, mobile_last4, enquiry_text,
  }).select().single()

  if (error || !enquiry) return serverError('Failed to create enquiry', error)
  await writeAudit({ action: 'CREATE', table_name: 'zcr_enquiries', record_id: enquiry.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { enq_code, full_name, mobile_last4 }, ...extractRequestMeta(req) })
  return created(enquiry)
})
