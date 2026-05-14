// GET + PATCH /…/tables/:tableId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateTableSchema } from '@/zifood/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tableId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)
  const { data, error } = await db.from('zfd_tables')
    .select('*, zfd_sections ( name )').eq('id', tableId).single()
  if (error || !data) return notFound('Table')
  if (data.entity_id !== entityId) return conflict('Access denied')
  return ok(data)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tableId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: table } = await db.from('zfd_tables')
    .select('id,entity_id,status').eq('id', tableId).single()
  if (!table) return notFound('Table')
  if (table.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateTableSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zfd_tables')
    .update(parsed.data).eq('id', tableId).select().single()
  if (error || !data) return serverError('Failed to update table', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zfd_tables', record_id: tableId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})
