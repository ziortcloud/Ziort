// GET    /…/quotes/:quoteId
// PATCH  /…/quotes/:quoteId
// DELETE /…/quotes/:quoteId (cancel — DRAFT only)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateQuoteSchema } from '@/ziquote/validators'
import { recalcQuoteTotals } from '@/zidocs/services/totals'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: quote, error } = await db.from('zqt_quotes')
    .select(`*, zqt_items ( * )`)
    .eq('id', quoteId).single()

  if (error || !quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot access another entity\'s quote')

  // Compute effective status (auto-expire past valid_until)
  const effectiveStatus = (quote.status === 'SENT' || quote.status === 'VIEWED') &&
    quote.valid_until && new Date(quote.valid_until) < new Date()
    ? 'EXPIRED' : quote.status

  return ok({ ...quote, effective_status: effectiveStatus,
    items: (quote as any).zqt_items?.sort((a: any, b: any) => a.sort_order - b.sort_order) ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: quote } = await db.from('zqt_quotes')
    .select('id,entity_id,status,supply_type').eq('id', quoteId).single()
  if (!quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot modify another entity\'s quote')
  if (!['DRAFT'].includes(quote.status)) return conflict(`Cannot edit a quote in status ${quote.status}`)

  const parsed = UpdateQuoteSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zqt_quotes')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', quoteId).select().single()
  if (error || !updated) return serverError('Failed to update quote', error)

  // If supply_type changed, recalc all item taxes
  if (parsed.data.supply_type && parsed.data.supply_type !== quote.supply_type) {
    await recalcQuoteTotals(quoteId)
  }

  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: quote } = await db.from('zqt_quotes')
    .select('id,entity_id,status').eq('id', quoteId).single()
  if (!quote) return notFound('Quote')
  if (quote.entity_id !== entityId) return conflict('Cannot delete another entity\'s quote')
  if (!['DRAFT','SENT','VIEWED'].includes(quote.status))
    return conflict(`Cannot cancel a quote in status ${quote.status}`)

  const { error } = await db.from('zqt_quotes')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', quoteId)
  if (error) return serverError('Failed to cancel quote', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zqt_quotes', record_id: quoteId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'EXPIRED' }, ...extractRequestMeta(req) })

  return ok({ cancelled: true, id: quoteId })
})
