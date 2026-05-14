// GET  /…/ziledger/:subscriptionId/gst  — GST summary for a period
// POST /…/ziledger/:subscriptionId/gst  — create/update GST return record
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpsertGstReturnSchema } from '@/ziledger/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')  // YYYY-MM
  const type   = searchParams.get('type')

  // Pull GST data from vouchers
  let vQuery = db.from('zlg_vouchers')
    .select('voucher_type,taxable_amount_paise,cgst_paise,sgst_paise,igst_paise')
    .eq('entity_id', entityId).eq('status', 'POSTED')

  if (period) vQuery = vQuery.eq('gst_return_period', period)

  const { data: vouchers } = await vQuery

  const summary = {
    period,
    sales: {
      taxable_paise: 0, cgst_paise: 0, sgst_paise: 0, igst_paise: 0,
    },
    purchases: {
      taxable_paise: 0, cgst_paise: 0, sgst_paise: 0, igst_paise: 0,
    },
    net_tax_payable_paise: 0,
  }

  for (const v of vouchers ?? []) {
    const bucket = ['SALES','CREDIT_NOTE'].includes(v.voucher_type) ? summary.sales : summary.purchases
    bucket.taxable_paise += v.taxable_amount_paise ?? 0
    bucket.cgst_paise    += v.cgst_paise ?? 0
    bucket.sgst_paise    += v.sgst_paise ?? 0
    bucket.igst_paise    += v.igst_paise ?? 0
  }

  const tax_collected  = summary.sales.cgst_paise + summary.sales.sgst_paise + summary.sales.igst_paise
  const tax_paid_input = summary.purchases.cgst_paise + summary.purchases.sgst_paise + summary.purchases.igst_paise
  summary.net_tax_payable_paise = Math.max(0, tax_collected - tax_paid_input)

  // Filed returns for this period
  let returnsQuery = db.from('zlg_gst_returns')
    .select('*').eq('entity_id', entityId).order('return_type')
  if (period) returnsQuery = returnsQuery.eq('return_period', period)
  if (type)   returnsQuery = returnsQuery.eq('return_type', type)

  const { data: returns } = await returnsQuery

  return ok({ summary, returns: returns ?? [] })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = UpsertGstReturnSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const total_tax = (parsed.data.total_cgst_paise ?? 0) +
                    (parsed.data.total_sgst_paise ?? 0) +
                    (parsed.data.total_igst_paise ?? 0)

  const { data, error } = await db.from('zlg_gst_returns').upsert({
    ...parsed.data,
    entity_id:        entityId,
    subscription_id:  subscriptionId,
    total_tax_paise:  total_tax,
    updated_at:       new Date().toISOString(),
    created_by:       session.individual.id,
  }, { onConflict: 'entity_id,return_type,return_period' }).select().single()

  if (error || !data) return serverError('Failed to save GST return', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zlg_gst_returns', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { return_type: parsed.data.return_type, return_period: parsed.data.return_period, status: parsed.data.status },
    ...extractRequestMeta(req) })

  return created(data)
})
