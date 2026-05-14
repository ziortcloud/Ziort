// GET + POST /…/zipartner/:subscriptionId/referrals
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const CreateReferralSchema = z.object({
  partner_id:      z.string().uuid(),
  referred_name:   z.string().min(1).max(200),
  referred_mobile: z.string().regex(/^\d{10}$/).optional(),
  notes:           z.string().max(300).optional(),
})

const ConvertReferralSchema = z.object({
  referred_entity_id:       z.string().uuid().optional(),
  revenue_generated_paise:  z.number().int().positive().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const partner_id = searchParams.get('partner_id')
  const status     = searchParams.get('status')

  let query = db.from('zpt_referrals')
    .select(`*, zpt_partners ( name, referral_code )`, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (partner_id) query = query.eq('partner_id', partner_id)
  if (status)     query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load referrals', error)
  return ok({ referrals: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'create'

  if (action === 'convert') {
    // PATCH-style via POST: convert a referral to CONVERTED
    const referralId = searchParams.get('referral_id')
    if (!referralId) return validationError({ message: 'referral_id required' } as any)

    const { data: referral } = await db.from('zpt_referrals')
      .select('id,entity_id,status,partner_id').eq('id', referralId).single()
    if (!referral) return notFound('Referral')
    if (referral.entity_id !== entityId) return conflict('Access denied')
    if (referral.status === 'CONVERTED') return conflict('Referral already converted')

    const parsed = ConvertReferralSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const { data: partnerRow } = await db.from('zpt_partners')
      .select('commission_pct,total_referrals,total_revenue_paise,total_commission_paise,pending_payout_paise')
      .eq('id', referral.partner_id).single()
    const commission_paise = Math.round(
      ((parsed.data.revenue_generated_paise ?? 0) * (partnerRow?.commission_pct ?? 5)) / 100
    )

    const now = new Date().toISOString()
    await db.from('zpt_referrals').update({
      status: 'CONVERTED', converted_at: now,
      referred_entity_id: parsed.data.referred_entity_id ?? null,
      revenue_generated_paise: parsed.data.revenue_generated_paise ?? 0,
      commission_paise, updated_at: now,
    }).eq('id', referralId)

    // Update partner stats (fetch then update — safe for low-concurrency)
    if (partnerRow) {
      await db.from('zpt_partners').update({
        total_referrals:        partnerRow.total_referrals + 1,
        total_revenue_paise:    partnerRow.total_revenue_paise + (parsed.data.revenue_generated_paise ?? 0),
        total_commission_paise: partnerRow.total_commission_paise + commission_paise,
        pending_payout_paise:   partnerRow.pending_payout_paise + commission_paise,
        updated_at:             now,
      }).eq('id', referral.partner_id)
    }

    return ok({ converted: true, commission_paise })
  }

  // Default: create referral
  const parsed = CreateReferralSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { referred_mobile, ...rest } = parsed.data
  const referred_mobile_hash  = referred_mobile ? createHash('sha256').update(referred_mobile.trim()).digest('hex') : null
  const referred_mobile_last4 = referred_mobile ? referred_mobile.slice(-4) : null

  const { data: partner } = await db.from('zpt_partners')
    .select('id,entity_id').eq('id', rest.partner_id).single()
  if (!partner || partner.entity_id !== entityId) return notFound('Partner')

  const { data, error } = await db.from('zpt_referrals').insert({
    ...rest, entity_id: entityId,
    referred_mobile_hash, referred_mobile_last4,
  }).select().single()

  if (error || !data) return serverError('Failed to record referral', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpt_referrals', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { partner_id: rest.partner_id, referred_name: rest.referred_name },
    ...extractRequestMeta(req) })

  return created(data)
})
