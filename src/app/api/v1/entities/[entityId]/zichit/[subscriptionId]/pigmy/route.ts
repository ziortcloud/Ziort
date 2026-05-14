// GET  /…/zichit/:subscriptionId/pigmy  — list all pigmy accounts
// POST /…/zichit/:subscriptionId/pigmy  — open a new pigmy account
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreatePigmySchema } from '@/zichit/validators'
import { nextPigmyCode } from '@/zichit/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'ACTIVE'
  const search = searchParams.get('q')

  let query = db.from('zct_pigmy_accounts')
    .select('id,zi_code,holder_name,mobile_last4,daily_amount_paise,balance_paise,total_deposits,status,opened_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('holder_name', `%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load pigmy accounts', error)
  return ok({ accounts: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreatePigmySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { mobile, ...rest } = parsed.data
  const mobile_hash  = mobile ? createHash('sha256').update(mobile.trim()).digest('hex') : null
  const mobile_last4 = mobile ? mobile.slice(-4) : null
  const zi_code = await nextPigmyCode()

  const { data, error } = await db.from('zct_pigmy_accounts').insert({
    ...rest,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    mobile_hash,
    mobile_last4,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to open pigmy account', error)

  await writeAudit({ action: 'CREATE', table_name: 'zct_pigmy_accounts', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, holder_name: parsed.data.holder_name, daily_amount_paise: parsed.data.daily_amount_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
