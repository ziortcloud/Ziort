// GET  /…/zishop/:subscriptionId/categories
// POST /…/zishop/:subscriptionId/categories
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateCategorySchema } from '@/zishop/validators'
import { nextCategoryCode } from '@/zishop/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const parent_id    = searchParams.get('parent_id')
  const active_only  = searchParams.get('active') !== 'false'

  let query = db.from('zsh_categories')
    .select('*')
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (active_only)           query = query.eq('is_active', true)
  if (parent_id === 'null')  query = query.is('parent_id', null)
  else if (parent_id)        query = query.eq('parent_id', parent_id)

  const { data, error } = await query
  if (error) return serverError('Failed to load categories', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateCategorySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextCategoryCode()
  const { data, error } = await db.from('zsh_categories').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
  }).select().single()

  if (error || !data) return serverError('Failed to create category', error)

  await writeAudit({ action: 'CREATE', table_name: 'zsh_categories', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name }, ...extractRequestMeta(req) })

  return created(data)
})
