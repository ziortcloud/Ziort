// GET  /…/zishop/:subscriptionId/customers
// POST /…/zishop/:subscriptionId/customers
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateCustomerSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const search      = searchParams.get('q')
  const mobile      = searchParams.get('mobile')
  const active_only = searchParams.get('active') !== 'false'

  let query = db.from('zsh_customers')
    .select('id,name,mobile_last4,email,gstin,loyalty_points,total_spent_paise,total_bills,is_active,created_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .order('total_spent_paise', { ascending: false })
    .range(offset, offset + limit - 1)

  if (active_only) query = query.eq('is_active', true)
  if (search)      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  if (mobile) {
    const hash = createHash('sha256').update(mobile.trim()).digest('hex')
    query = query.eq('mobile_hash', hash)
  }

  const { data, count, error } = await query
  if (error) return serverError('Failed to load customers', error)
  return ok({ customers: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateCustomerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { mobile, ...rest } = parsed.data
  const mobile_hash  = mobile ? createHash('sha256').update(mobile.trim()).digest('hex') : null
  const mobile_last4 = mobile ? mobile.slice(-4) : null

  const { data, error } = await db.from('zsh_customers').insert({
    ...rest,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    mobile_hash,
    mobile_last4,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create customer', error)

  await writeAudit({ action: 'CREATE', table_name: 'zsh_customers', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { name: parsed.data.name, mobile_last4 }, ...extractRequestMeta(req) })

  return created(data)
})
