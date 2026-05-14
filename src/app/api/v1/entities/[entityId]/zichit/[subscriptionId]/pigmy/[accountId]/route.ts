// GET   /…/pigmy/:accountId  — account detail + deposit history
// PATCH /…/pigmy/:accountId  — deposit or close account
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { DepositPigmySchema, ClosePigmySchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, accountId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: account } = await db.from('zct_pigmy_accounts')
    .select('*').eq('id', accountId).single()
  if (!account) return notFound('Pigmy account')
  if (account.entity_id !== entityId) return conflict('Access denied')

  const { page, limit, offset } = parsePagination(req.url)
  const { data: deposits, count } = await db.from('zct_pigmy_deposits')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('deposit_date', { ascending: false })
    .range(offset, offset + limit - 1)

  const { mobile_hash, ...safe } = account
  return ok({ account: safe, deposits: deposits ?? [], total: count ?? 0, page, limit })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, accountId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'deposit'

  const { data: account } = await db.from('zct_pigmy_accounts')
    .select('id,entity_id,status,balance_paise,zi_code').eq('id', accountId).single()
  if (!account) return notFound('Pigmy account')
  if (account.entity_id !== entityId) return conflict('Access denied')

  if (action === 'close') {
    if (account.status === 'CLOSED') return conflict('Account is already closed')
    const parsed = ClosePigmySchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const { data, error } = await db.from('zct_pigmy_accounts').update({
      status: 'CLOSED', closed_at: parsed.data.closed_at, updated_at: new Date().toISOString(),
    }).eq('id', accountId).select().single()
    if (error || !data) return serverError('Failed to close account', error)

    await writeAudit({ action: 'UPDATE', table_name: 'zct_pigmy_accounts', record_id: accountId,
      entity_id: entityId, individual_id: session.individual.id,
      new_value: { status: 'CLOSED', balance_paise: account.balance_paise }, ...extractRequestMeta(req) })

    return ok({ closed: true, balance_paise: account.balance_paise })
  }

  // Default: deposit
  if (account.status !== 'ACTIVE') return conflict(`Cannot deposit to a ${account.status} account`)

  const parsed = DepositPigmySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const balance_after_paise = account.balance_paise + parsed.data.amount_paise

  // Trigger on zct_pigmy_deposits handles balance update
  const { data: deposit, error } = await db.from('zct_pigmy_deposits').insert({
    account_id:          accountId,
    entity_id:           entityId,
    deposit_date:        parsed.data.deposit_date ?? new Date().toISOString().split('T')[0],
    amount_paise:        parsed.data.amount_paise,
    payment_mode:        parsed.data.payment_mode ?? 'CASH',
    reference_number:    parsed.data.reference_number ?? null,
    balance_after_paise,
    collected_by:        parsed.data.collected_by ?? null,
    notes:               parsed.data.notes ?? null,
    created_by:          session.individual.id,
  }).select().single()

  if (error || !deposit) return serverError('Failed to record deposit', error)

  await writeAudit({ action: 'CREATE', table_name: 'zct_pigmy_deposits', record_id: deposit.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { account_id: accountId, amount_paise: parsed.data.amount_paise, balance_after_paise },
    ...extractRequestMeta(req) })

  return ok({ deposited: true, deposit, balance_paise: balance_after_paise })
})
