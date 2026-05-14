// GET  /api/v1/entities/:entityId/zicare/:subscriptionId/appointments
// POST /api/v1/entities/:entityId/zicare/:subscriptionId/appointments
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextAppointmentCode, appointmentRefCode } from '@/zicare/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, badRequest, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateAppointmentSchema } from '@/zicare/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const doctorId  = searchParams.get('doctor_id')
  const patientId = searchParams.get('patient_id')
  const date      = searchParams.get('date')

  let query = db.from('zcr_appointments').select(`
    id, zi_code, ref_code, status, appointment_type,
    scheduled_at, duration_minutes, fee_paise, paid_paise, created_at,
    zcr_patients ( id, zi_code, full_name, mobile_last4 ),
    zcr_doctors  ( id, zi_code, full_name, specialization )
  `, { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .order('scheduled_at', { ascending: false }).range(offset, offset + limit - 1)

  if (status)    query = query.eq('status', status)
  if (doctorId)  query = query.eq('doctor_id', doctorId)
  if (patientId) query = query.eq('patient_id', patientId)
  if (date) query = query.gte('scheduled_at', `${date}T00:00:00Z`).lte('scheduled_at', `${date}T23:59:59Z`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load appointments', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateAppointmentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { patient_id, doctor_id, branch_id, appointment_type, scheduled_at, duration_minutes, chief_complaint, fee_paise } = parsed.data

  const { data: patient } = await db.from('zcr_patients').select('id').eq('id', patient_id).eq('subscription_id', subscriptionId).single()
  if (!patient) return notFound('Patient')

  const { data: doctor } = await db.from('zcr_doctors').select('id').eq('id', doctor_id).eq('subscription_id', subscriptionId).single()
  if (!doctor) return notFound('Doctor')

  const apptEnd = new Date(new Date(scheduled_at).getTime() + (duration_minutes ?? 30) * 60000).toISOString()
  const { data: slotConflict } = await db.from('zcr_appointments').select('id, zi_code')
    .eq('doctor_id', doctor_id).in('status', ['scheduled','confirmed','in_progress'])
    .lt('scheduled_at', apptEnd)
    .gt('scheduled_at', new Date(new Date(scheduled_at).getTime() - (duration_minutes ?? 30) * 60000).toISOString())
    .maybeSingle()
  if (slotConflict) return badRequest(`Doctor already has appointment ${slotConflict.zi_code} in this time slot`)

  const entity_zi  = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const appt_code  = await nextAppointmentCode()
  const ref_code   = appointmentRefCode(entity_zi, sub.zi_code, appt_code)

  const { data: appointment, error } = await db.from('zcr_appointments').insert({
    zi_code: appt_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    branch_id, patient_id, doctor_id, appointment_type,
    scheduled_at, duration_minutes: duration_minutes ?? 30,
    chief_complaint: chief_complaint ?? null, fee_paise: fee_paise ?? 0,
    created_by: session.individual.id,
  }).select().single()

  if (error || !appointment) return serverError('Failed to create appointment', error)
  await writeAudit({ action: 'CREATE', table_name: 'zcr_appointments', record_id: appointment.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { appt_code, patient_id, doctor_id, appointment_type, scheduled_at }, ...extractRequestMeta(req) })
  return created(appointment)
})
