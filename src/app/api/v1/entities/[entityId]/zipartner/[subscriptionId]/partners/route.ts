// GET + POST /…/zipartner/:subscriptionId/partners
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextPartnerCode, generateReferralCode } from '@/zipartner/services/codes'

const CreatePartnerSchema = z.object({
  name:           z.string().min(1).max(200),
  mobile:         z.string().regex(/^\d{10}$/).optional(),
  email:          z.string().email().optional(),
  commission_pct: z.number().min(0).max(50).optional(),
  bank_account_number: z.string().max(20).optional(),
  bank_ifsc:      z.string().max(11).optional(),
  bank_account_name: z.string().max(200).optional(),
  upi_id:         z.string().max(100).optional(),
  contact_id:     z.string().uuid().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const tier   = searchParams.get('tier')
  const search = searchParams.get('q')

  let query = db.from('zpt_partners')
    .select('id,zi_code,name,mobile_last4,referral_code,tier,commission_pct,total_referrals,total_commission_paise,pending_payout_paise,is_active,joined_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .order('total_commission_paise', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tier)    query = query.eq('tier', tier)
  if (search)  query = query.or(`name.ilike.%${search}%,referral_code.ilike.%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load partners', error)
  return ok({ partners: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreatePartnerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { mobile, ...rest } = parsed.data
  const mobile_hash  = mobile ? createHash('sha256').update(mobile.trim()).digest('hex') : null
  const mobile_last4 = mobile ? mobile.slice(-4) : null

  // Generate unique referral code
  let referral_code: string = ''
  let attempts = 0
  while (attempts < 5) {
    const candidate = generateReferralCode()
    const { count } = await db.from('zpt_partners')
      .select('id', { count: 'exact', head: true }).eq('referral_code', candidate)
    if ((count ?? 0) === 0) { referral_code = candidate; break }
    attempts++
  }
  if (!referral_code) return serverError('Could not generate unique referral code — try again', null)

  const zi_code = await nextPartnerCode()

  const { data, error } = await db.from('zpt_partners').insert({
    ...rest,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    mobile_hash,
    mobile_last4,
    referral_code,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to register partner', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpt_partners', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: rest.name, referral_code }, ...extractRequestMeta(req) })

  return created(data)
})
