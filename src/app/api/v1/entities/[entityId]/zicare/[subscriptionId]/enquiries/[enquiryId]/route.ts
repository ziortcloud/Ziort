// GET   /api/v1/entities/:entityId/zicare/:subscriptionId/enquiries/:enquiryId
// PATCH /api/v1/entities/:entityId/zicare/:subscriptionId/enquiries/:enquiryId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, badRequest, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateEnquirySchema = z.object({
  status:       z.enum(['open','followed_up','converted','closed']).optional(),
  converted_to: z.string().uuid().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, enquiryId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: enquiry, error } = await db.from('zcr_enquiries')
    .select('*, zcr_patients ( id, zi_code, full_name )')
    .eq('id', enquiryId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !enquiry) return notFound('Enquiry')
  return ok(enquiry)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, enquiryId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: enquiry } = await db.from('zcr_enquiries')
    .select('id, status, ref_code').eq('id', enquiryId).eq('entity_id', entityId).single()
  if (!enquiry) return notFound('Enquiry')
  if (enquiry.status === 'converted') return badRequest('Enquiry already converted')

  const parsed = UpdateEnquirySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { status, converted_to } = parsed.data
  if (converted_to) {
    const { data: patient } = await db.from('zcr_patients').select('id')
      .eq('id', converted_to).eq('subscription_id', subscriptionId).single()
    if (!patient) return notFound('Patient')
  }

  const { data: updated, error } = await db.from('zcr_enquiries').update({
    status: status ?? 'converted', converted_to: converted_to ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', enquiryId).select().single()

  if (error || !updated) return serverError('Failed to update enquiry', error)
  await writeAudit({ action: 'UPDATE', table_name: 'zcr_enquiries', record_id: enquiryId,
    ref_code: enquiry.ref_code, entity_id: entityId, individual_id: session.individual.id,
    old_value: { status: enquiry.status }, new_value: { status: updated.status, converted_to }, ...extractRequestMeta(req) })
  return ok(updated)
})
