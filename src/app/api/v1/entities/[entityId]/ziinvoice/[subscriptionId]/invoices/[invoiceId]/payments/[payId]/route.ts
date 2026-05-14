// GET /…/invoices/:invoiceId/payments/:payId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId, payId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Access denied')

  const { data: payment, error } = await db.from('znvc_payments')
    .select('*').eq('id', payId).eq('invoice_id', invoiceId).single()
  if (error || !payment) return notFound('Payment')

  // Attach linked receipt if exists
  let receipt = null
  if (payment.receipt_id) {
    const { data: r } = await db.from('zrcp_receipts')
      .select('id,zi_code,amount_words,status').eq('id', payment.receipt_id).maybeSingle()
    receipt = r
  }

  return ok({ ...payment, receipt })
})
