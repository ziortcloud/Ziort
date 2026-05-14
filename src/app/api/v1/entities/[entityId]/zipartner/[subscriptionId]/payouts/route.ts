// GET + POST /…/zipartner/:subscriptionId/payouts
// POST ?action=pay — mark payout as PAID
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextPayoutCode } from '@/zipartner/services/codes'

const PAYMENT_MODES = ['BANK','UPI','CASH','CHEQUE','OTHER'] as const

const CreatePayoutSchema = z.object({
  partner_id:       z.string().uuid(),
  amount_paise:     z.number().int().positive(),
  payment_mode:     z.enum(PAYMENT_MODES).optional(),
  reference_number: z.string().max(100).optional(),
  notes:            z.string().max(300).optional(),
})

const MarkPaidSchema = z.object({
  payout_id:        z.string().uuid(),
  reference_number: z.string().max(100).optional(),
  paid_at:          z.string().optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const partner_id = searchParams.get('partner_id')
  const status     = searchParams.get('status')

  let query = db.from('zpt_payouts')
    .select(`*, zpt_partners ( name, referral_code )`, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (partner_id) query = query.eq('partner_id', partner_id)
  if (status)     query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load payouts', error)
  return ok({ payouts: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'create'

  if (action === 'pay') {
    const parsed = MarkPaidSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const { data: payout } = await db.from('zpt_payouts')
      .select('id,entity_id,status,amount_paise').eq('id', parsed.data.payout_id).single()
    if (!payout) return notFound('Payout')
    if (payout.entity_id !== entityId) return conflict('Access denied')
    if (payout.status === 'PAID') return conflict('Payout already marked as paid')

    const { data, error } = await db.from('zpt_payouts').update({
      status:           'PAID',
      paid_at:          parsed.data.paid_at ?? new Date().toISOString(),
      reference_number: parsed.data.reference_number ?? null,
    }).eq('id', parsed.data.payout_id).select().single()

    if (error || !data) return serverError('Failed to mark payout as paid', error)

    await writeAudit({ action: 'UPDATE', table_name: 'zpt_payouts', record_id: parsed.data.payout_id,
      entity_id: entityId, individual_id: session.individual.id,
      new_value: { status: 'PAID', amount_paise: payout.amount_paise }, ...extractRequestMeta(req) })

    return ok({ paid: true, payout: data })
  }

  // Default: create payout record
  const parsed = CreatePayoutSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: partner } = await db.from('zpt_partners')
    .select('id,entity_id,pending_payout_paise').eq('id', parsed.data.partner_id).single()
  if (!partner || partner.entity_id !== entityId) return notFound('Partner')
  if (parsed.data.amount_paise > partner.pending_payout_paise)
    return conflict(`Payout (₹${parsed.data.amount_paise/100}) exceeds pending amount (₹${partner.pending_payout_paise/100})`)

  const zi_code = await nextPayoutCode()

  const { data, error } = await db.from('zpt_payouts').insert({
    zi_code,
    partner_id:       parsed.data.partner_id,
    entity_id:        entityId,
    amount_paise:     parsed.data.amount_paise,
    payment_mode:     parsed.data.payment_mode ?? 'BANK',
    reference_number: parsed.data.reference_number ?? null,
    notes:            parsed.data.notes ?? null,
    created_by:       session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create payout', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpt_payouts', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, partner_id: parsed.data.partner_id, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
