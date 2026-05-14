// GET / PATCH / DELETE  /…/quotes/:quoteId/items/:itemId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateDocItemSchema } from '@/ziquote/validators'
import { calcLineItem } from '@/zidocs/services/gst'
import { recalcQuoteTotals } from '@/zidocs/services/totals'

async function resolveQuoteItem(quoteId: string, itemId: string, entityId: string) {
  const [{ data: quote }, { data: item }] = await Promise.all([
    db.from('zqt_quotes').select('id,entity_id,status,supply_type').eq('id', quoteId).single(),
    db.from('zqt_items').select('*').eq('id', itemId).eq('quote_id', quoteId).single(),
  ])
  return { quote, item }
}

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const { quote, item } = await resolveQuoteItem(quoteId, itemId, entityId)
  if (!quote || !item) return notFound('Item')
  if (quote.entity_id !== entityId) return conflict('Access denied')
  return ok(item)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { quote, item } = await resolveQuoteItem(quoteId, itemId, entityId)
  if (!quote || !item) return notFound('Item')
  if (quote.entity_id !== entityId) return conflict('Access denied')
  if (quote.status !== 'DRAFT') return conflict('Can only edit items on a DRAFT quote')

  const parsed = UpdateDocItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const merged = {
    qty:          parsed.data.qty          ?? item.qty,
    rate_paise:   parsed.data.rate_paise   ?? item.rate_paise,
    discount_pct: parsed.data.discount_pct ?? item.discount_pct,
    gst_rate_pct: parsed.data.gst_rate_pct ?? item.gst_rate_pct,
  }
  const computed = calcLineItem({ ...merged, is_interstate: quote.supply_type === 'INTERSTATE' })

  const { data: updated, error } = await db.from('zqt_items')
    .update({ ...parsed.data, ...computed, updated_at: new Date().toISOString() })
    .eq('id', itemId).select().single()
  if (error || !updated) return serverError('Failed to update item', error)

  await recalcQuoteTotals(quoteId)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, quoteId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { quote, item } = await resolveQuoteItem(quoteId, itemId, entityId)
  if (!quote || !item) return notFound('Item')
  if (quote.entity_id !== entityId) return conflict('Access denied')
  if (quote.status !== 'DRAFT') return conflict('Can only delete items on a DRAFT quote')

  const { error } = await db.from('zqt_items').delete().eq('id', itemId)
  if (error) return serverError('Failed to delete item', error)

  await recalcQuoteTotals(quoteId)
  return ok({ deleted: true, id: itemId })
})
