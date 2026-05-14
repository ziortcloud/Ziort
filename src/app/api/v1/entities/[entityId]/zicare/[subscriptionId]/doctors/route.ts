// GET  /api/v1/entities/:entityId/zicare/:subscriptionId/doctors
// POST /api/v1/entities/:entityId/zicare/:subscriptionId/doctors
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { nextDoctorCode } from '@/zicare/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, forbidden, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const CreateDoctorSchema = z.object({
  full_name:              z.string().min(2).max(120),
  specialization:         z.string().min(2).max(120),
  qualification:          z.string().min(2).max(120),
  registration_number:    z.string().max(50).optional(),
  consultation_fee_paise: z.number().int().min(0),
  individual_id:          z.string().uuid().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const activeOnly = new URL(req.url).searchParams.get('active') !== 'false'

  let query = db.from('zcr_doctors').select('*', { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .order('full_name', { ascending: true }).range(offset, offset + limit - 1)
  if (activeOnly) query = query.eq('is_active', true)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load doctors', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)
  const { role } = await requireEntityAccess(session, entityId)
  if (!['owner','co_owner','manager'].includes(role)) return forbidden('Only owners and managers can add doctors')

  const parsed = CreateDoctorSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { full_name, specialization, qualification, registration_number, consultation_fee_paise, individual_id } = parsed.data
  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const doc_code  = await nextDoctorCode()
  const ref_code  = `${entity_zi}${sub.zi_code}${doc_code}`

  const { data: doctor, error } = await db.from('zcr_doctors').insert({
    zi_code: doc_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    individual_id: individual_id ?? null, full_name, specialization, qualification,
    registration_number: registration_number ?? null, consultation_fee_paise,
    created_by: session.individual.id,
  }).select().single()

  if (error || !doctor) return serverError('Failed to create doctor', error)
  await writeAudit({ action: 'CREATE', table_name: 'zcr_doctors', record_id: doctor.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: doc_code, full_name, specialization }, ...extractRequestMeta(req) })
  return created(doctor)
})
