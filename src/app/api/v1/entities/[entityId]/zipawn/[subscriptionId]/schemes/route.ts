// GET  /api/v1/entities/:entityId/zipawn/:subscriptionId/schemes
// POST /api/v1/entities/:entityId/zipawn/:subscriptionId/schemes
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateSchemeSchema } from '@/zipawn/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  let query = db.from('zpn_schemes')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .order('is_default', { ascending: false })
    .order('scheme_name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (activeOnly) query = query.eq('is_active', true)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load schemes', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateSchemeSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Check scheme_code unique within entity
  const { data: existing } = await db.from('zpn_schemes')
    .select('id').eq('entity_id', entityId).eq('scheme_code', parsed.data.scheme_code).maybeSingle()
  if (existing) return conflict(`Scheme code '${parsed.data.scheme_code}' already exists`)

  // If this is set as default, unset all others
  if (parsed.data.is_default) {
    await db.from('zpn_schemes').update({ is_default: false })
      .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
  }

  const { data: scheme, error } = await db.from('zpn_schemes').insert({
    ...parsed.data,
    entity_id: entityId, subscription_id: subscriptionId,
    created_by: session.individual.id,
  }).select().single()

  if (error || !scheme) return serverError('Failed to create scheme', error)

  await writeAudit({ action: 'CREATE', table_name: 'zpn_schemes', record_id: scheme.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { scheme_code: scheme.scheme_code, scheme_name: scheme.scheme_name },
    ...extractRequestMeta(req) })

  return created(scheme)
})
