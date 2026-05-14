// GET  /…/ziledger/:subscriptionId/accounts
// POST /…/ziledger/:subscriptionId/accounts
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CreateAccountSchema } from '@/ziledger/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const account_type = searchParams.get('type')
  const active_only  = searchParams.get('active') !== 'false'

  let query = db.from('zlg_accounts')
    .select('id,zi_code,name,account_type,account_group,parent_id,opening_balance,current_balance,is_system,is_active')
    .eq('entity_id', entityId)
    .order('account_type').order('name')

  if (active_only)   query = query.eq('is_active', true)
  if (account_type)  query = query.eq('account_type', account_type)

  const { data, error } = await query
  if (error) return serverError('Failed to load accounts', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateAccountSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Generate sequential account code for this entity
  const { count } = await db.from('zlg_accounts')
    .select('id', { count: 'exact', head: true }).eq('entity_id', entityId)
  const zi_code = `ACC${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data, error } = await db.from('zlg_accounts').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    current_balance: parsed.data.opening_balance ?? 0,
  }).select().single()

  if (error || !data) return serverError('Failed to create account', error)

  await writeAudit({ action: 'CREATE', table_name: 'zlg_accounts', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name, account_type: parsed.data.account_type },
    ...extractRequestMeta(req) })

  return created(data)
})
