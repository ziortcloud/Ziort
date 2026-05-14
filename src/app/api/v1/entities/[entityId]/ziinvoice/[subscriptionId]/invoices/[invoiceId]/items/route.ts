// GET / POST  /…/invoices/:invoiceId/items
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddInvoiceItemSchema } from '@/ziinvoice/validators'
import { calcLineItem } from '@/zidocs/services/gst'
import { recalcInvoiceTotals } from '@/zidocs/services/totals'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Access denied')

  const { data: items, error } = await db.from('znvc_items')
    .select('*').eq('invoice_id', invoiceId).order('sort_order').order('created_at')
  if (error) return serverError('Failed to load items', error)
  return ok(items ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id,status,supply_type').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Access denied')
  if (invoice.status !== 'DRAFT') return conflict('Can only add items to a DRAFT invoice')

  const parsed = AddInvoiceItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const computed = calcLineItem({
    qty:           parsed.data.qty,
    rate_paise:    parsed.data.rate_paise,
    discount_pct:  parsed.data.discount_pct,
    gst_rate_pct:  parsed.data.gst_rate_pct,
    is_interstate: invoice.supply_type === 'INTERSTATE',
  })

  const { data: item, error } = await db.from('znvc_items').insert({
    invoice_id:  invoiceId,
    description: parsed.data.description,
    hsn_sac:     parsed.data.hsn_sac     ?? null,
    qty:         parsed.data.qty,
    unit:        parsed.data.unit        ?? null,
    rate_paise:  parsed.data.rate_paise,
    discount_pct: parsed.data.discount_pct,
    gst_rate_pct: parsed.data.gst_rate_pct,
    sort_order:  parsed.data.sort_order,
    ...computed,
  }).select().single()

  if (error || !item) return serverError('Failed to add item', error)

  await recalcInvoiceTotals(invoiceId)
  return created(item)
})
