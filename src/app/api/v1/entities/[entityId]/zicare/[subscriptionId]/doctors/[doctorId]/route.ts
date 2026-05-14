// GET   /api/v1/entities/:entityId/zicare/:subscriptionId/doctors/:doctorId
// PATCH /api/v1/entities/:entityId/zicare/:subscriptionId/doctors/:doctorId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateDoctorSchema = z.object({
  full_name:              z.string().min(2).max(120).optional(),
  specialization:         z.string().min(2).max(120).optional(),
  qualification:          z.string().min(2).max(120).optional(),
  registration_number:    z.string().max(50).optional().nullable(),
  consultation_fee_paise: z.number().int().min(0).optional(),
  is_active:              z.boolean().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, doctorId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doctor, error } = await db.from('zcr_doctors').select('*')
    .eq('id', doctorId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !doctor) return notFound('Doctor')

  const today = new Date().toISOString().slice(0, 10)
  const { count: todayCount } = await db.from('zcr_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', `${today}T00:00:00Z`).lte('scheduled_at', `${today}T23:59:59Z`)
    .in('status', ['scheduled','confirmed','in_progress'])

  return ok({ ...doctor, today_appointments: todayCount ?? 0 })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, doctorId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpdateDoctorSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: doctor, error } = await db.from('zcr_doctors')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', doctorId).eq('entity_id', entityId).select().single()

  if (error || !doctor) return serverError('Failed to update doctor', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zcr_doctors', record_id: doctorId,
    ref_code: doctor.ref_code, entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })
  return ok(doctor)
})
