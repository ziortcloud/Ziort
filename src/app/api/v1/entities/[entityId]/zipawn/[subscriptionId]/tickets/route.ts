// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets
// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/tickets
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateTicketSchema } from '@/zipawn/validators'
import { nextTicketCode, ticketRefCode } from '@/zipawn/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const customerId = searchParams.get('customer_id')
  const branchId   = searchParams.get('branch_id')

  let query = db.from('zpn_tickets')
    .select(`
      id, zi_code, ref_code, status, item_count, total_appraised_paise, max_eligible_paise,
      sanctioned_paise, interest_rate_pm, tenure_days, disbursed_at, created_at,
      zpn_customers ( id, full_name, mobile_last4, kyc_status ),
      zi_branches   ( id, branch_name )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)     query = query.eq('status', status)
  if (customerId) query = query.eq('customer_id', customerId)
  if (branchId)   query = query.eq('branch_id', branchId)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load tickets', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateTicketSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { customer_id, branch_id, scheme_id } = parsed.data

  // Verify customer exists and belongs to this entity
  const { data: customer } = await db.from('zpn_customers')
    .select('id,zi_code,is_blacklisted,is_active').eq('id', customer_id).eq('entity_id', entityId).single()
  if (!customer) return notFound('Customer')
  if (!customer.is_active) return conflict('Customer is deactivated')
  if (customer.is_blacklisted) return conflict('Customer is blacklisted — cannot create ticket')

  // Verify scheme if provided
  if (scheme_id) {
    const { data: scheme } = await db.from('zpn_schemes')
      .select('id,is_active').eq('id', scheme_id).eq('entity_id', entityId).single()
    if (!scheme || !scheme.is_active) return notFound('Scheme')
  }

  const [entityRow, subRow] = await Promise.all([
    db.from('zi_entities').select('zi_code').eq('id', entityId).single(),
    db.from('zi_subscriptions').select('zi_code').eq('id', subscriptionId).single(),
  ])
  const ticketCode = await nextTicketCode()
  const ref_code   = ticketRefCode(entityRow.data?.zi_code ?? '', subRow.data?.zi_code ?? '', ticketCode)

  const { data: ticket, error } = await db.from('zpn_tickets').insert({
    zi_code:        ticketCode,
    ref_code,
    entity_id:      entityId,
    subscription_id: subscriptionId,
    branch_id,
    customer_id,
    scheme_id:      scheme_id ?? null,
    status:         'draft',
    created_by:     session.individual.id,
  }).select().single()

  if (error || !ticket) return serverError('Failed to create ticket', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpn_tickets', record_id: ticket.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code: ticketCode, ref_code, customer_id, branch_id },
    ...extractRequestMeta(req) })

  return created(ticket)
})
