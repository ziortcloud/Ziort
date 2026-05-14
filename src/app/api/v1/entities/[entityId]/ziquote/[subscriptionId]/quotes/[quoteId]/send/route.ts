// POST /…/quotes/:quoteId/send  — DRAFT → SENT
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: quote } = await db.from('zqt_quotes')
    .select('id,entity_id,status,grand_total_paise').eq('id', quoteId).single()
  if (!quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot send another entity\'s quote')
  if (quote.status !== 'DRAFT') return conflict(`Quote is already ${quote.status}`)
  if (quote.grand_total_paise === 0) return conflict('Cannot send an empty quote — add at least one item')

  const now = new Date().toISOString()
  const { data: updated, error } = await db.from('zqt_quotes')
    .update({ status: 'SENT', sent_at: now, updated_at: now }).eq('id', quoteId).select().single()
  if (error || !updated) return serverError('Failed to send quote', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zqt_quotes', record_id: quoteId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'SENT' }, ...extractRequestMeta(req) })

  return ok({ sent: true, quote: updated })
})
