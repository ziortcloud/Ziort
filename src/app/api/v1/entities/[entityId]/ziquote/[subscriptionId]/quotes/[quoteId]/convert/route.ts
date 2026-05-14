// POST /…/quotes/:quoteId/convert
// Converts an ACCEPTED quote → new ZiInvoice (TAX_INVOICE).
// Copies all customer details and line items. Marks quote CONVERTED.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { nextInvoiceCode } from '@/ziinvoice/services/codes'
import { recalcInvoiceTotals } from '@/zidocs/services/totals'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: quote, error: qErr } = await db.from('zqt_quotes')
    .select(`*, zqt_items(*)`)
    .eq('id', quoteId).single()
  if (qErr || !quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot convert another entity\'s quote')
  if (quote.status !== 'ACCEPTED') return conflict('Only ACCEPTED quotes can be converted to invoices')
  if (quote.converted_invoice_id) return conflict('Quote has already been converted to an invoice')

  const body = await req.json().catch(() => ({}))

  // Fetch invoice settings for due_date default
  const { data: settings } = await db.from('znvc_settings')
    .select('default_due_days').eq('entity_id', entityId).maybeSingle()
  const due_days = settings?.default_due_days ?? 30
  const due = new Date()
  due.setDate(due.getDate() + due_days)
  const due_date = body.due_date ?? due.toISOString().split('T')[0]

  const zi_code = await nextInvoiceCode()

  // Create invoice
  const { data: invoice, error: invErr } = await db.from('znvc_invoices').insert({
    zi_code,
    entity_id:        entityId,
    subscription_id:  subscriptionId,
    quote_id:         quoteId,
    invoice_type:     'TAX_INVOICE',
    customer_name:    quote.customer_name,
    customer_gstin:   quote.customer_gstin,
    customer_address: quote.customer_address,
    customer_city:    quote.customer_city,
    customer_state:   quote.customer_state,
    customer_email:   quote.customer_email,
    customer_mobile:  quote.customer_mobile,
    contact_id:       quote.contact_id,
    supply_type:      quote.supply_type,
    subject:          quote.subject,
    notes:            quote.notes,
    terms:            quote.terms,
    footer:           quote.footer,
    due_date,
    created_by:       session.individual.id,
  }).select().single()

  if (invErr || !invoice) return serverError('Failed to create invoice from quote', invErr)

  // Copy all line items
  const items = (quote as any).zqt_items ?? []
  if (items.length > 0) {
    const invoiceItems = items.map(({ id: _, quote_id: __, created_at: ___, updated_at: ____, ...rest }: any) => ({
      ...rest,
      invoice_id: invoice.id,
    }))
    await db.from('znvc_items').insert(invoiceItems)
  }

  // Recalc invoice totals from copied items
  await recalcInvoiceTotals(invoice.id)

  // Mark quote as CONVERTED
  const now = new Date().toISOString()
  await db.from('zqt_quotes').update({
    status: 'CONVERTED', converted_invoice_id: invoice.id, updated_at: now,
  }).eq('id', quoteId)

  await writeAudit({ action: 'CREATE', table_name: 'znvc_invoices', record_id: invoice.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, source: 'quote_conversion', quote_id: quoteId },
    ...extractRequestMeta(req) })

  const { data: freshInvoice } = await db.from('znvc_invoices')
    .select('*').eq('id', invoice.id).single()

  return ok({ invoice: freshInvoice, quote_id: quoteId })
})
