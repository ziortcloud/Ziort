// GET  /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets
// POST /api/v1/entities/:entityId/zicalc/:subscriptionId/sheets
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateSheetSchema } from '@/zicalc/validators'
import { nextSheetCode } from '@/zicalc/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const category    = searchParams.get('category')
  const archived    = searchParams.get('archived') === 'true'

  let query = db.from('zclc_sheets')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('is_archived', archived)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category', category)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load sheets', error)
  return ok({ sheets: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateSheetSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextSheetCode()

  const { data: sheet, error } = await db.from('zclc_sheets').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !sheet) return serverError('Failed to create sheet', error)

  await writeAudit({ action: 'CREATE', table_name: 'zclc_sheets', record_id: sheet.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name, category: parsed.data.category },
    ...extractRequestMeta(req) })

  return created(sheet)
})
