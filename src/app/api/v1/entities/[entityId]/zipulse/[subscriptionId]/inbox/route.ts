// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/inbox
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/inbox
// Smart Inbox — zero-friction capture before organizing
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, paginated, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateInboxItemSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'  // pending|converted|archived

  const { data, count, error } = await db.from('zipulse_inbox')
    .select('*, zi_individuals!captured_by ( id, display_name )', { count: 'exact' })
    .eq('entity_id', entityId).eq('subscription_id', subscriptionId)
    .eq('status', status)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return serverError('Failed to load inbox', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateInboxItemSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { content_type, content, media_url } = parsed.data

  const { data: item, error } = await db.from('zipulse_inbox').insert({
    entity_id: entityId, subscription_id: subscriptionId,
    captured_by: session.individual.id,
    content_type, content: content ?? null, media_url: media_url ?? null,
  }).select().single()

  if (error || !item) return serverError('Failed to capture inbox item', error)
  return created(item)
})
