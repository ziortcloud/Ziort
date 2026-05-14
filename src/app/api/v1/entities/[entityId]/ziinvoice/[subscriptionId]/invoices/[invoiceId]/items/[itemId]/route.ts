// GET / PATCH / DELETE  /…/invoices/:invoiceId/items/:itemId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateInvoiceItemSchema } from '@/ziinvoice/validators'
import { calcLineItem } from '@/zidocs/services/gst'
import { recalcInvoiceTotals } from '@/zidocs/services/totals'

async function resolveInvoiceItem(invoiceId: string, itemId: string) {
  const [{ data: invoice }, { data: item }] = await Promise.all([
    db.from('znvc_invoices').select('id,entity_id,status,supply_type').eq('id', invoiceId).single(),
    db.from('znvc_items').select('*').eq('id', itemId).eq('invoice_id', invoiceId).single(),
  ])
  return { invoice, item }
}

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const { invoice, item } = await resolveInvoiceItem(invoiceId, itemId)
  if (!invoice || !item) return notFound('Item')
  if (invoice.entity_id !== entityId) return conflict('Access denied')
  return ok(item)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { invoice, item } = await resolveInvoiceItem(invoiceId, itemId)
  if (!invoice || !item) return notFound('Item')
  if (invoice.entity_id !== entityId) return conflict('Access denied')
  if (invoice.status !== 'DRAFT') return conflict('Can only edit items on a DRAFT invoice')

  const parsed = UpdateInvoiceItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const merged = {
    qty:          parsed.data.qty          ?? item.qty,
    rate_paise:   parsed.data.rate_paise   ?? item.rate_paise,
    discount_pct: parsed.data.discount_pct ?? item.discount_pct,
    gst_rate_pct: parsed.data.gst_rate_pct ?? item.gst_rate_pct,
  }
  const computed = calcLineItem({ ...merged, is_interstate: invoice.supply_type === 'INTERSTATE' })

  const { data: updated, error } = await db.from('znvc_items')
    .update({ ...parsed.data, ...computed, updated_at: new Date().toISOString() })
    .eq('id', itemId).select().single()
  if (error || !updated) return serverError('Failed to update item', error)

  await recalcInvoiceTotals(invoiceId)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { invoice, item } = await resolveInvoiceItem(invoiceId, itemId)
  if (!invoice || !item) return notFound('Item')
  if (invoice.entity_id !== entityId) return conflict('Access denied')
  if (invoice.status !== 'DRAFT') return conflict('Can only delete items on a DRAFT invoice')

  const { error } = await db.from('znvc_items').delete().eq('id', itemId)
  if (error) return serverError('Failed to delete item', error)

  await recalcInvoiceTotals(invoiceId)
  return ok({ deleted: true, id: itemId })
})
