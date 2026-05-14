// GET  /…/zifood/:subscriptionId/tables
// POST /…/zifood/:subscriptionId/tables
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateTableSchema } from '@/zifood/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const section_id  = searchParams.get('section_id')
  const status      = searchParams.get('status')
  const active_only = searchParams.get('active') !== 'false'

  let query = db.from('zfd_tables')
    .select('*, zfd_sections ( name )')
    .eq('entity_id', entityId)
    .order('zi_code')

  if (active_only) query = query.eq('is_active', true)
  if (section_id)  query = query.eq('section_id', section_id)
  if (status)      query = query.eq('status', status)

  const { data, error } = await query
  if (error) return serverError('Failed to load tables', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateTableSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zfd_tables').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
  }).select().single()

  if (error || !data) return serverError('Failed to create table', error)

  await writeAudit({ action: 'CREATE', table_name: 'zfd_tables', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { name: parsed.data.name, zi_code: parsed.data.zi_code }, ...extractRequestMeta(req) })

  return created(data)
})
