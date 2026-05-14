// GET   /api/v1/entities/:entityId/zicare/:subscriptionId/patients/:patientId
// PATCH /api/v1/entities/:entityId/zicare/:subscriptionId/patients/:patientId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdatePatientSchema = z.object({
  full_name:              z.string().min(2).max(120).optional(),
  email:                  z.string().email().optional().nullable(),
  address:                z.string().max(255).optional().nullable(),
  city:                   z.string().max(80).optional().nullable(),
  state:                  z.string().max(80).optional().nullable(),
  blood_group:            z.string().optional().nullable(),
  allergies:              z.array(z.string()).optional(),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  notes:                  z.string().max(1000).optional().nullable(),
  status:                 z.enum(['active','inactive','blacklisted']).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, patientId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: patient, error } = await db
    .from('zcr_patients')
    .select('*, zi_branches ( id, zi_code, name, city )')
    .eq('id', patientId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()

  if (error || !patient) return notFound('Patient')

  const { count: totalVisits } = await db
    .from('zcr_appointments').select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId).eq('status', 'completed')

  const { data: nextAppt } = await db
    .from('zcr_appointments')
    .select('id, scheduled_at, appointment_type, zcr_doctors(full_name)')
    .eq('patient_id', patientId).in('status', ['scheduled','confirmed'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true }).limit(1).maybeSingle()

  return ok({ ...patient, total_visits: totalVisits ?? 0, next_appointment: nextAppt ?? null })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, patientId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpdatePatientSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: patient, error } = await db
    .from('zcr_patients')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', patientId).eq('entity_id', entityId).select().single()

  if (error || !patient) return serverError('Failed to update patient', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zcr_patients', record_id: patientId,
    ref_code: patient.ref_code, entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })
  return ok(patient)
})
