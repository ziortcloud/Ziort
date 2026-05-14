// POST /…/quotes/:quoteId/accept  — SENT|VIEWED → ACCEPTED
// Also: ?action=reject → REJECTED
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'accept'   // accept | reject

  const { data: quote } = await db.from('zqt_quotes')
    .select('id,entity_id,status,valid_until').eq('id', quoteId).single()
  if (!quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot update another entity\'s quote')
  if (!['SENT','VIEWED'].includes(quote.status)) return conflict(`Cannot respond to a quote in status ${quote.status}`)
  if (quote.valid_until && new Date(quote.valid_until) < new Date())
    return conflict('This quote has expired')

  const body = await req.json().catch(() => ({}))
  const now  = new Date().toISOString()

  if (action === 'reject') {
    const { data: updated, error } = await db.from('zqt_quotes').update({
      status: 'REJECTED', rejected_at: now, rejection_note: body.rejection_note ?? null, updated_at: now,
    }).eq('id', quoteId).select().single()
    if (error || !updated) return serverError('Failed to reject quote', error)
    return ok({ rejected: true, quote: updated })
  }

  const { data: updated, error } = await db.from('zqt_quotes').update({
    status: 'ACCEPTED', accepted_at: now, updated_at: now,
  }).eq('id', quoteId).select().single()
  if (error || !updated) return serverError('Failed to accept quote', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zqt_quotes', record_id: quoteId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'ACCEPTED' }, ...extractRequestMeta(req) })

  return ok({ accepted: true, quote: updated })
})
