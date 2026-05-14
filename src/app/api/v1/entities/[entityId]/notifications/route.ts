// GET   /api/v1/entities/:entityId/notifications        → list my notifications
// POST  /api/v1/entities/:entityId/notifications/read   → mark as read
//
// Query params (GET):
//   limit  — default 50
//   unread — 'true' to filter unread only

import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { listNotifications, markRead } from '@/ziorbitcore/services/notifications'
import { ok, validationError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const url = new URL(req.url)
  const limit  = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const unread = url.searchParams.get('unread') === 'true'

  const { items, unreadCount } = await listNotifications(
    session.individual.id,
    entityId,
    Math.min(limit, 200)
  )

  const filtered = unread ? items.filter(n => !n.readAt) : items
  return ok({ items: filtered, unreadCount })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const body = await req.json().catch(() => ({}))
  const schema = z.object({
    ids: z.array(z.string().uuid()).optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  await markRead(session.individual.id, parsed.data.ids)
  return ok({ marked: true })
})
