// GET  /…/invoices  — paginated list with filters
// POST /…/invoices  — create new invoice (DRAFT)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateInvoiceSchema } from '@/ziinvoice/validators'
import { nextInvoiceCode } from '@/ziinvoice/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status       = searchParams.get('status')
  const invoice_type = searchParams.get('type')
  const search       = searchParams.get('q')
  const overdue      = searchParams.get('overdue') === 'true'

  let query = db.from('znvc_invoices')
    .select(`
      id, zi_code, invoice_type, customer_name, customer_city,
      invoice_date, due_date, status,
      grand_total_paise, amount_paid_paise, amount_due_paise, amount_words, created_at
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)       query = query.eq('status', status)
  if (invoice_type) query = query.eq('invoice_type', invoice_type)
  if (search)       query = query.or(
    `customer_name.ilike.%${search}%,zi_code.ilike.%${search}%`
  )
  if (overdue)      query = query
    .in('status', ['SENT','VIEWED','PARTIALLY_PAID'])
    .lt('due_date', new Date().toISOString().split('T')[0])

  const { data, count, error } = await query
  if (error) return serverError('Failed to load invoices', error)
  return ok({ invoices: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateInvoiceSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Compute due_date from settings if not provided
  let due_date = parsed.data.due_date
  if (!due_date) {
    const { data: settings } = await db.from('znvc_settings')
      .select('default_due_days').eq('entity_id', entityId).maybeSingle()
    const days = settings?.default_due_days ?? 30
    const d = new Date()
    d.setDate(d.getDate() + days)
    due_date = d.toISOString().split('T')[0]
  }

  const zi_code = await nextInvoiceCode()

  const { data: invoice, error } = await db.from('znvc_invoices').insert({
    ...parsed.data,
    due_date,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !invoice) return serverError('Failed to create invoice', error)

  await writeAudit({ action: 'CREATE', table_name: 'znvc_invoices', record_id: invoice.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, customer_name: parsed.data.customer_name, invoice_type: parsed.data.invoice_type },
    ...extractRequestMeta(req) })

  return created(invoice)
})
