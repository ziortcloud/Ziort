// GET  /api/v1/entities/:entityId/ziquote/:subscriptionId/quotes
// POST /api/v1/entities/:entityId/ziquote/:subscriptionId/quotes
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateQuoteSchema } from '@/ziquote/validators'
import { nextQuoteCode } from '@/ziquote/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const search   = searchParams.get('q')

  let query = db.from('zqt_quotes')
    .select(`
      id, zi_code, customer_name, customer_city, quote_date, valid_until,
      subject, status, grand_total_paise, amount_words, created_at
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.or(
    `customer_name.ilike.%${search}%,zi_code.ilike.%${search}%,subject.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return serverError('Failed to load quotes', error)
  return ok({ quotes: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateQuoteSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Validate calc_sheet_id belongs to this entity
  if (parsed.data.calc_sheet_id) {
    const { data: sheet } = await db.from('zclc_sheets')
      .select('id').eq('id', parsed.data.calc_sheet_id).eq('entity_id', entityId).maybeSingle()
    if (!sheet) return conflict('ZiCalc sheet not found or not owned by this entity')
  }

  const zi_code = await nextQuoteCode()

  // Build valid_until from settings default if not provided
  let valid_until = parsed.data.valid_until
  if (!valid_until) {
    const { data: settings } = await db.from('zqt_settings')
      .select('default_validity_days').eq('entity_id', entityId).maybeSingle()
    const days = settings?.default_validity_days ?? 30
    const d = new Date()
    d.setDate(d.getDate() + days)
    valid_until = d.toISOString().split('T')[0]
  }

  const { data: quote, error } = await db.from('zqt_quotes').insert({
    ...parsed.data,
    valid_until,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !quote) return serverError('Failed to create quote', error)

  await writeAudit({ action: 'CREATE', table_name: 'zqt_quotes', record_id: quote.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, customer_name: parsed.data.customer_name, supply_type: parsed.data.supply_type },
    ...extractRequestMeta(req) })

  return created(quote)
})
