// GET  /api/v1/entities/:entityId/subscriptions → list subscriptions
// POST /api/v1/entities/:entityId/subscriptions → subscribe to a product
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { nextSubscriptionCode, subscriptionRefCode } from '@/ziorbitcore/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { SubscribeProductSchema } from '@/ziorbitcore/validators/entity'
import { ok, created, validationError, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { PRODUCT_CODES } from '@/ziorbitcore/types/core'

const PRODUCT_NAMES: Record<string, string> = {
  ZPN:   'ZiPawn',   ZFLT: 'ZiFleet',  ZLD:   'ZiLoad',
  ZFD:   'ZiFood',   ZCR:  'ZiCare',   ZSHP:  'ZiShop',
  ZCHT:  'ZiChit',   ZBLD: 'ZiBuild',  ZYLD:  'ZiYield',
  ZPST:  'ZiPost',   ZSCN: 'ZiScan',   ZCLC:  'ZiCalc',
  ZRCP:  'ZiReceipt',ZNVC: 'ZiInvoice',ZQT:   'ZiQuote',
  ZLDG:  'ZiLedger', ZPRTN:'ZiPartner',ZPLS:  'ZiPulse',
  ZND:   'ZiNeed',
}

const TRIAL_DAYS = 180 // 6 months

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const { data: subs } = await db
    .from('zi_subscriptions')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  return ok(subs ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const { role } = await requireEntityAccess(session, entityId)

  // Only owners can subscribe to new products
  if (!['owner', 'co_owner'].includes(role)) {
    return new Response(
      JSON.stringify({ error: 'Only owners can add product subscriptions', code: 'FORBIDDEN' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()
  const parsed = SubscribeProductSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { product_code, plan_type, is_annual } = parsed.data

  // Fetch entity code for reference code construction
  const { data: entity } = await db
    .from('zi_entities')
    .select('zi_code')
    .eq('id', entityId)
    .single()

  if (!entity) return new Response(JSON.stringify({ error: 'Entity not found' }), { status: 404 })

  // Check not already subscribed to this product
  const { data: existing } = await db
    .from('zi_subscriptions')
    .select('id, status')
    .eq('entity_id', entityId)
    .eq('product_code', product_code)
    .maybeSingle()

  if (existing && existing.status !== 'cancelled') {
    return conflict(`Already subscribed to ${PRODUCT_NAMES[product_code] ?? product_code}`)
  }

  // Generate subscription code using product prefix
  const sub_zi_code = await nextSubscriptionCode(product_code)
  const ref_code    = subscriptionRefCode(entity.zi_code, sub_zi_code)

  const now = new Date()
  const trial_end = new Date(now)
  trial_end.setDate(trial_end.getDate() + TRIAL_DAYS)

  const { data: subscription, error: subError } = await db
    .from('zi_subscriptions')
    .insert({
      zi_code:          sub_zi_code,
      entity_id:        entityId,
      ref_code,
      product_code,
      product_name:     PRODUCT_NAMES[product_code] ?? product_code,
      plan_type:        plan_type === 'trial' ? 'trial' : plan_type,
      status:           'trial',
      trial_start:      now.toISOString().split('T')[0],
      trial_end:        trial_end.toISOString().split('T')[0],
      billing_start:    null,
      is_annual,
      primary_owner_id: session.individual.id,
      billing_owner_id: session.individual.id,
    })
    .select()
    .single()

  if (subError || !subscription) return serverError('Failed to create subscription', subError)

  const meta = extractRequestMeta(req)
  await writeAudit({
    action:        'CREATE',
    table_name:    'zi_subscriptions',
    record_id:     subscription.id,
    ref_code,
    entity_id:     entityId,
    individual_id: session.individual.id,
    new_value:     { ref_code, product_code, plan_type, status: 'trial' },
    ...meta,
  })

  return created(subscription)
})
