// GET  /api/v1/entities/:entityId/zicare/:subscriptionId/patients
// POST /api/v1/entities/:entityId/zicare/:subscriptionId/patients
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextPatientCode, patientRefCode } from '@/zicare/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreatePatientSchema } from '@/zicare/validators'

const hashMobile = (m: string) => crypto.createHash('sha256').update(m).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const search   = searchParams.get('search') ?? ''
  const status   = searchParams.get('status')
  const branchId = searchParams.get('branch_id')

  let query = db
    .from('zcr_patients')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search)   query = query.or(`full_name.ilike.%${search}%,mobile_last4.eq.${search}`)
  if (status)   query = query.eq('status', status)
  if (branchId) query = query.eq('branch_id', branchId)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load patients', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { full_name, mobile, branch_id, date_of_birth, gender, email, blood_group, allergies,
    address, city, state, emergency_contact_name, emergency_contact_mobile } = parsed.data

  const mobile_hash  = hashMobile(mobile)
  const mobile_last4 = mobile.slice(-4)

  const { data: existing } = await db
    .from('zcr_patients')
    .select('id, zi_code')
    .eq('subscription_id', subscriptionId)
    .eq('mobile_hash', mobile_hash)
    .neq('status', 'blacklisted')
    .maybeSingle()
  if (existing) return conflict(`Patient with this mobile already exists (${existing.zi_code})`)

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const pat_code  = await nextPatientCode()
  const ref_code  = patientRefCode(entity_zi, sub.zi_code, pat_code)

  const ec_hash  = emergency_contact_mobile ? hashMobile(emergency_contact_mobile) : null
  const ec_last4 = emergency_contact_mobile ? emergency_contact_mobile.slice(-4) : null

  const { data: patient, error } = await db.from('zcr_patients').insert({
    zi_code: pat_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    branch_id, full_name, mobile_hash, mobile_last4,
    date_of_birth: date_of_birth ?? null, gender: gender ?? null,
    email: email ?? null, blood_group: blood_group ?? null, allergies: allergies ?? [],
    address: address ?? null, city: city ?? null, state: state ?? null,
    emergency_contact_name: emergency_contact_name ?? null,
    emergency_contact_mobile_hash: ec_hash, emergency_contact_mobile_last4: ec_last4,
    created_by: session.individual.id,
  }).select().single()

  if (error || !patient) return serverError('Failed to create patient', error)

  await writeAudit({ action: 'CREATE', table_name: 'zcr_patients', record_id: patient.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: pat_code, full_name, mobile_last4 }, ...extractRequestMeta(req) })

  return created(patient)
})
