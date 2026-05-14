// GET + PATCH /…/accounts/:accountId — with transaction ledger (GET)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { UpdateAccountSchema } from '@/ziledger/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, accountId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: account, error } = await db.from('zlg_accounts')
    .select('*').eq('id', accountId).single()
  if (error || !account) return notFound('Account')
  if (account.entity_id !== entityId) return conflict('Access denied')

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const date_from = searchParams.get('date_from')
  const date_to   = searchParams.get('date_to')

  let txQuery = db.from('zlg_voucher_lines')
    .select(`
      id, entry_type, amount_paise, narration, sort_order,
      zlg_vouchers ( zi_code, voucher_type, voucher_date, narration, reference_number, status )
    `, { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (date_from) txQuery = txQuery.gte('zlg_vouchers.voucher_date', date_from)
  if (date_to)   txQuery = txQuery.lte('zlg_vouchers.voucher_date', date_to)

  const { data: transactions, count } = await txQuery

  return ok({ account, transactions: transactions ?? [], total: count ?? 0, page, limit })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, accountId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: account } = await db.from('zlg_accounts')
    .select('id,entity_id,is_system').eq('id', accountId).single()
  if (!account) return notFound('Account')
  if (account.entity_id !== entityId) return conflict('Access denied')
  if (account.is_system) return conflict('System accounts cannot be modified')

  const parsed = UpdateAccountSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zlg_accounts')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', accountId).select().single()
  if (error || !data) return serverError('Failed to update account', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zlg_accounts', record_id: accountId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})
