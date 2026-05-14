// GET  /…/invoices/:invoiceId/payments
// POST /…/invoices/:invoiceId/payments  — record a payment + auto-create receipt
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordPaymentSchema } from '@/ziinvoice/validators'
import { nextReceiptCode } from '@/zireceipt/services/codes'
import { amountInWords } from '@/zidocs/services/amount-words'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Access denied')

  const { data: payments, error } = await db.from('znvc_payments')
    .select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false })
  if (error) return serverError('Failed to load payments', error)
  return ok(payments ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id,status,grand_total_paise,amount_paid_paise,amount_due_paise,customer_name,customer_mobile')
    .eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Cannot record payment on another entity\'s invoice')
  if (['DRAFT','CANCELLED'].includes(invoice.status))
    return conflict(`Cannot record payment on a ${invoice.status} invoice — send it first`)
  if (invoice.status === 'PAID') return conflict('Invoice is already fully paid')

  const parsed = RecordPaymentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.amount_paise > invoice.amount_due_paise)
    return conflict(`Payment (₹${parsed.data.amount_paise/100}) exceeds amount due (₹${invoice.amount_due_paise/100})`)

  // Insert payment — DB trigger updates invoice.amount_paid_paise and status
  const { data: payment, error: payErr } = await db.from('znvc_payments').insert({
    invoice_id:       invoiceId,
    amount_paise:     parsed.data.amount_paise,
    payment_date:     parsed.data.payment_date ?? new Date().toISOString().split('T')[0],
    payment_mode:     parsed.data.payment_mode,
    reference_number: parsed.data.reference_number ?? null,
    note:             parsed.data.note ?? null,
    created_by:       session.individual.id,
  }).select().single()

  if (payErr || !payment) return serverError('Failed to record payment', payErr)

  // Auto-create receipt
  const rcp_code = await nextReceiptCode()
  const { data: receipt } = await db.from('zrcp_receipts').insert({
    zi_code:             rcp_code,
    entity_id:           entityId,
    subscription_id:     subscriptionId,
    receipt_type:        'INVOICE_PAYMENT',
    invoice_id:          invoiceId,
    invoice_payment_id:  payment.id,
    payer_name:          invoice.customer_name,
    payer_mobile:        invoice.customer_mobile ?? null,
    receipt_date:        payment.payment_date,
    amount_paise:        parsed.data.amount_paise,
    payment_mode:        parsed.data.payment_mode,
    reference_number:    parsed.data.reference_number ?? null,
    purpose:             `Invoice ${invoiceId} payment`,
    amount_words:        amountInWords(parsed.data.amount_paise),
    created_by:          session.individual.id,
  }).select('id,zi_code').single()

  // Link receipt back to payment record
  if (receipt) {
    await db.from('znvc_payments').update({ receipt_id: receipt.id }).eq('id', payment.id)
  }

  await writeAudit({ action: 'CREATE', table_name: 'znvc_payments', record_id: payment.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { invoice_id: invoiceId, amount_paise: parsed.data.amount_paise, payment_mode: parsed.data.payment_mode },
    ...extractRequestMeta(req) })

  return created({ payment, receipt: receipt ?? null })
})
