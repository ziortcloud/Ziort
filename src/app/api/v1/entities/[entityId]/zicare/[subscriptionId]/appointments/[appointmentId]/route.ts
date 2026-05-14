// GET   /api/v1/entities/:entityId/zicare/:subscriptionId/appointments/:appointmentId
// PATCH /api/v1/entities/:entityId/zicare/:subscriptionId/appointments/:appointmentId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, badRequest, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CompleteAppointmentSchema } from '@/zicare/validators'
import { z } from 'zod'

const UpdateStatusSchema = z.object({
  status: z.enum(['confirmed','in_progress','completed','cancelled','no_show']),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, appointmentId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: appt, error } = await db.from('zcr_appointments').select(`
    *,
    zcr_patients ( id, zi_code, full_name, mobile_last4, blood_group, allergies, date_of_birth ),
    zcr_doctors  ( id, zi_code, full_name, specialization, qualification ),
    zi_branches  ( id, zi_code, name, city )
  `).eq('id', appointmentId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()

  if (error || !appt) return notFound('Appointment')
  return ok(appt)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, appointmentId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: appt } = await db.from('zcr_appointments')
    .select('id, status, ref_code, fee_paise').eq('id', appointmentId).eq('entity_id', entityId).single()
  if (!appt) return notFound('Appointment')
  if (['cancelled','no_show'].includes(appt.status)) return badRequest(`Appointment already ${appt.status}`)

  const body = await req.json()
  const isCompletion = body.diagnosis !== undefined || body.prescription !== undefined || body.paid_paise !== undefined

  if (isCompletion) {
    const parsed = CompleteAppointmentSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const { diagnosis, prescription, follow_up_date, paid_paise } = parsed.data
    if (paid_paise > appt.fee_paise) return badRequest(`Payment exceeds fee`)

    const { data: updated, error } = await db.from('zcr_appointments').update({
      status: 'completed', diagnosis: diagnosis ?? null, prescription: prescription ?? null,
      follow_up_date: follow_up_date ?? null, paid_paise, updated_at: new Date().toISOString(),
    }).eq('id', appointmentId).select().single()
    if (error || !updated) return serverError('Failed to complete appointment', error)
    await writeAudit({ action: 'UPDATE', table_name: 'zcr_appointments', record_id: appointmentId,
      ref_code: appt.ref_code, entity_id: entityId, individual_id: session.individual.id,
      old_value: { status: appt.status }, new_value: { status: 'completed', paid_paise }, ...extractRequestMeta(req) })
    return ok(updated)
  }

  const parsed = UpdateStatusSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zcr_appointments')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId).select().single()
  if (error || !updated) return serverError('Failed to update appointment', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zcr_appointments', record_id: appointmentId,
    ref_code: appt.ref_code, entity_id: entityId, individual_id: session.individual.id,
    old_value: { status: appt.status }, new_value: { status: parsed.data.status }, ...extractRequestMeta(req) })
  return ok(updated)
})
