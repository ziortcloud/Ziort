// GET /…/partners/:partnerId  — partner detail with referrals + payouts
// PATCH /…/partners/:partnerId  — update tier, commission, bank details
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdatePartnerSchema = z.object({
  name:              z.string().min(1).max(200).optional(),
  tier:              z.enum(['STANDARD','SILVER','GOLD','PLATINUM']).optional(),
  commission_pct:    z.number().min(0).max(50).optional(),
  bank_account_number: z.string().max(20).optional(),
  bank_ifsc:         z.string().max(11).optional(),
  bank_account_name: z.string().max(200).optional(),
  upi_id:            z.string().max(100).optional(),
  is_active:         z.boolean().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, partnerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const [pResult, referralsResult, payoutsResult] = await Promise.all([
    db.from('zpt_partners').select('*').eq('id', partnerId).single(),
    db.from('zpt_referrals').select('id,referred_name,status,converted_at,commission_paise,created_at')
      .eq('partner_id', partnerId).order('created_at', { ascending: false }),
    db.from('zpt_payouts').select('id,zi_code,amount_paise,payment_mode,status,paid_at,created_at')
      .eq('partner_id', partnerId).order('created_at', { ascending: false }),
  ])

  if (pResult.error || !pResult.data) return notFound('Partner')
  if (pResult.data.entity_id !== entityId) return conflict('Access denied')

  const { mobile_hash, ...safe } = pResult.data
  return ok({ ...safe, referrals: referralsResult.data ?? [], payouts: payoutsResult.data ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, partnerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: partner } = await db.from('zpt_partners')
    .select('id,entity_id').eq('id', partnerId).single()
  if (!partner) return notFound('Partner')
  if (partner.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdatePartnerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zpt_partners')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', partnerId).select().single()
  if (error || !data) return serverError('Failed to update partner', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpt_partners', record_id: partnerId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  const { mobile_hash, ...safe } = data
  return ok(safe)
})
