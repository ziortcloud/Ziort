// GET   /…/receipts/:receiptId
// PATCH /…/receipts/:receiptId  — cancel only (status: ACTIVE → CANCELLED)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CancelReceiptSchema } from '@/zireceipt/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, receiptId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: receipt, error } = await db.from('zrcp_receipts')
    .select(`
      *,
      znvc_invoices ( zi_code, customer_name, grand_total_paise, status )
    `)
    .eq('id', receiptId).single()

  if (error || !receipt) return notFound('Receipt')
  if (receipt.entity_id !== entityId) return conflict('Cannot access another entity\'s receipt')
  return ok(receipt)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, receiptId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: receipt } = await db.from('zrcp_receipts')
    .select('id,entity_id,status,receipt_type').eq('id', receiptId).single()
  if (!receipt) return notFound('Receipt')
  if (receipt.entity_id !== entityId) return conflict('Cannot cancel another entity\'s receipt')
  if (receipt.status === 'CANCELLED') return conflict('Receipt is already cancelled')
  if (receipt.receipt_type === 'INVOICE_PAYMENT')
    return conflict('Cannot cancel an invoice payment receipt — reverse the payment through the invoice instead')

  const parsed = CancelReceiptSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const now = new Date().toISOString()
  const { data: updated, error } = await db.from('zrcp_receipts').update({
    status:        'CANCELLED',
    cancelled_at:  now,
    cancel_reason: parsed.data.cancel_reason,
  }).eq('id', receiptId).select().single()

  if (error || !updated) return serverError('Failed to cancel receipt', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zrcp_receipts', record_id: receiptId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED', cancel_reason: parsed.data.cancel_reason },
    ...extractRequestMeta(req) })

  return ok({ cancelled: true, receipt: updated })
})
