// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/customers
// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/customers
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateCustomerSchema } from '@/zipawn/validators'
import { nextCustomerCode, customerRefCode } from '@/zipawn/services/codes'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const search       = searchParams.get('search') ?? ''
  const kycStatus    = searchParams.get('kyc_status')
  const blacklisted  = searchParams.get('blacklisted')
  const activeOnly   = searchParams.get('active') !== 'false'

  let query = db.from('zpn_customers')
    .select('id,zi_code,ref_code,full_name,full_name_local,mobile_last4,email,city,state,kyc_status,is_blacklisted,is_active,active_loans,total_loans,total_borrowed_paise,total_paid_paise,created_at', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (activeOnly) query = query.eq('is_active', true)
  if (kycStatus)  query = query.eq('kyc_status', kycStatus)
  if (blacklisted === 'true')  query = query.eq('is_blacklisted', true)
  if (blacklisted === 'false') query = query.eq('is_blacklisted', false)
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,mobile_last4.eq.${search},city.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error) return serverError('Failed to load customers', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateCustomerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const d = parsed.data
  const mobile_hash  = sha256(d.mobile)
  const mobile_last4 = d.mobile.slice(-4)

  const { data: dup } = await db.from('zpn_customers')
    .select('id,zi_code').eq('subscription_id', subscriptionId).eq('mobile_hash', mobile_hash).maybeSingle()
  if (dup) return conflict(`Customer already exists (${dup.zi_code})`)

  const [entityRow, subRow] = await Promise.all([
    db.from('zi_entities').select('zi_code').eq('id', entityId).single(),
    db.from('zi_subscriptions').select('zi_code').eq('id', subscriptionId).single(),
  ])
  const entityCode = entityRow.data?.zi_code ?? ''
  const subCode    = subRow.data?.zi_code    ?? ''
  const cstCode    = await nextCustomerCode()
  const ref_code   = customerRefCode(entityCode, subCode, cstCode)

  const id_hash  = d.id_number ? sha256(d.id_number)     : null
  const id_last6 = d.id_number ? d.id_number.slice(-6)   : null
  const alt_hash = d.alternate_mobile ? sha256(d.alternate_mobile) : null

  const { data: customer, error } = await db.from('zpn_customers').insert({
    zi_code:               cstCode,
    ref_code,
    entity_id:             entityId,
    subscription_id:       subscriptionId,
    branch_id:             d.branch_id ?? null,
    full_name:             d.full_name,
    full_name_local:       d.full_name_local ?? null,
    dob:                   d.dob ?? null,
    gender:                d.gender ?? null,
    occupation:            d.occupation ?? null,
    mobile_hash,
    mobile_last4,
    alternate_mobile_hash: alt_hash,
    email:                 d.email ?? null,
    address:               d.address ?? null,
    city:                  d.city ?? null,
    state:                 d.state ?? null,
    pincode:               d.pincode ?? null,
    photo_url:             d.photo_url ?? null,
    id_type:               d.id_type ?? null,
    id_hash,
    id_last6,
    id_proof_url:          d.id_proof_url ?? null,
    address_proof_type:    d.address_proof_type ?? null,
    address_proof_url:     d.address_proof_url ?? null,
    kyc_status:            d.kyc_status,
    kyc_notes:             d.kyc_notes ?? null,
    nominee_name:          d.nominee_name ?? null,
    nominee_relation:      d.nominee_relation ?? null,
    nominee_dob:           d.nominee_dob ?? null,
    nominee_mobile_last4:  d.nominee_mobile ? d.nominee_mobile.slice(-4) : null,
    guardian_name:         d.guardian_name ?? null,
    guardian_id_type:      d.guardian_id_type ?? null,
    guardian_id_last6:     d.guardian_id_last6 ?? null,
    created_by:            session.individual.id,
  }).select().single()

  if (error || !customer) return serverError('Failed to create customer', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpn_customers', record_id: customer.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: cstCode, ref_code, full_name: d.full_name, mobile_last4 },
    ...extractRequestMeta(req) })

  return created(customer)
})
