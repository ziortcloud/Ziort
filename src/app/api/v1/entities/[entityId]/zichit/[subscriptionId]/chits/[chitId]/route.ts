// GET   /…/chits/:chitId  — full chit detail with members, contributions, auctions
// PATCH /…/chits/:chitId  — update status or settings
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateChitSchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const [chitResult, membersResult, auctionsResult] = await Promise.all([
    db.from('zct_chits').select('*').eq('id', chitId).single(),
    db.from('zct_members').select('*').eq('chit_id', chitId).order('ticket_number'),
    db.from('zct_auctions').select('*').eq('chit_id', chitId).order('cycle_number'),
  ])

  if (chitResult.error || !chitResult.data) return notFound('Chit')
  if (chitResult.data.entity_id !== entityId) return conflict('Access denied')

  // Contribution summary per member per cycle
  const { data: contributions } = await db.from('zct_contributions')
    .select('id,member_id,cycle_number,amount_paise,penalty_paise,paid_date,payment_mode')
    .eq('chit_id', chitId).order('cycle_number')

  return ok({
    ...chitResult.data,
    members:       membersResult.data ?? [],
    auctions:      auctionsResult.data ?? [],
    contributions: contributions ?? [],
  })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id,status').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')
  if (chit.status === 'COMPLETED' || chit.status === 'DISSOLVED')
    return conflict(`Cannot modify a ${chit.status} chit`)

  const parsed = UpdateChitSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zct_chits')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', chitId).select().single()
  if (error || !data) return serverError('Failed to update chit', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zct_chits', record_id: chitId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})
