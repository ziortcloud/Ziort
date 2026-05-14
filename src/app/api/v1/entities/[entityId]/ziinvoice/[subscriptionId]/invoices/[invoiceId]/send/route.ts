// POST /…/invoices/:invoiceId/send  — DRAFT → SENT
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, invoiceId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: invoice } = await db.from('znvc_invoices')
    .select('id,entity_id,status,grand_total_paise').eq('id', invoiceId).single()
  if (!invoice) return notFound('Invoice')
  if (invoice.entity_id !== entityId) return conflict('Cannot send another entity\'s invoice')
  if (invoice.status !== 'DRAFT') return conflict(`Invoice is already ${invoice.status}`)
  if (invoice.grand_total_paise === 0) return conflict('Cannot send an empty invoice — add at least one item')

  const now = new Date().toISOString()
  const { data: updated, error } = await db.from('znvc_invoices')
    .update({ status: 'SENT', sent_at: now, updated_at: now }).eq('id', invoiceId).select().single()
  if (error || !updated) return serverError('Failed to send invoice', error)

  await writeAudit({ action: 'UPDATE', table_name: 'znvc_invoices', record_id: invoiceId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'SENT' }, ...extractRequestMeta(req) })

  return ok({ sent: true, invoice: updated })
})
