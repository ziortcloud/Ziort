// GET / PATCH / DELETE  /…/invoices/:invoiceId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateInvoiceSchema } from '@/ziinvoice/validators'
import { recalcInvoiceTotals } from '@/zidocs/services/totals'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice, error } = await db.from('znvc_invoices')
    .select(`*, znvc_items(*), znvc_payments(*)`)
    .eq('id', invoiceId).single()

  if (error || !invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Cannot access another entity\'s invoice')

  // Effective status — mark overdue at read time
  const isOverdue = ['SENT','VIEWED','PARTIALLY_PAID'].includes(invoice.status) &&
    invoice.due_date && new Date(invoice.due_date) < new Date()
  const effective_status = isOverdue ? 'OVERDUE' : invoice.status

  return ok({
    ...invoice,
    effective_status,
    items:    (invoice as any).znvc_items?.sort((a: any, b: any) => a.sort_order - b.sort_order) ?? [],
    payments: (invoice as any).znvc_payments ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id,status,supply_type').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Cannot modify another entity\'s invoice')
  if (!['DRAFT'].includes(invoice.status)) return conflict(`Cannot edit an invoice in status ${invoice.status}`)

  const parsed = UpdateInvoiceSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('znvc_invoices')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', invoiceId).select().single()
  if (error || !updated) return serverError('Failed to update invoice', error)

  // Recalc taxes if supply_type changed
  if (parsed.data.supply_type && parsed.data.supply_type !== invoice.supply_type) {
    await recalcInvoiceTotals(invoiceId)
  }

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id,status,amount_paid_paise').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Cannot cancel another entity\'s invoice')
  if (['PAID','CANCELLED'].includes(invoice.status)) return conflict(`Invoice is already ${invoice.status}`)
  if (invoice.amount_paid_paise > 0) return conflict('Cannot cancel an invoice with recorded payments')

  const body = await req.json().catch(() => ({}))
  const now  = new Date().toISOString()

  const { error } = await db.from('znvc_invoices').update({
    status: 'CANCELLED', cancelled_at: now, cancel_reason: body.cancel_reason ?? null, updated_at: now,
  }).eq('id', invoiceId)

  if (error) return serverError('Failed to cancel invoice', error)

  await writeAudit({ action: 'UPDATE', table_name: 'znvc_invoices', record_id: invoiceId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED' }, ...extractRequestMeta(req) })

  return ok({ cancelled: true, id: invoiceId })
})
