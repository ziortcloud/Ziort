// GET  /…/ziledger/:subscriptionId/vouchers
// POST /…/ziledger/:subscriptionId/vouchers  — create balanced journal entry
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateVoucherSchema } from '@/ziledger/validators'
import { nextVoucherCode } from '@/ziledger/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const type        = searchParams.get('type')
  const date_from   = searchParams.get('date_from')
  const date_to     = searchParams.get('date_to')
  const period      = searchParams.get('period')
  const status      = searchParams.get('status') ?? 'POSTED'
  const search      = searchParams.get('q')

  let query = db.from('zlg_vouchers')
    .select('id,zi_code,voucher_type,voucher_date,narration,reference_number,total_debit_paise,status,gst_return_period,created_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .order('voucher_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)    query = query.eq('status', status)
  if (type)      query = query.eq('voucher_type', type)
  if (date_from) query = query.gte('voucher_date', date_from)
  if (date_to)   query = query.lte('voucher_date', date_to)
  if (period)    query = query.eq('gst_return_period', period)
  if (search)    query = query.or(
    `zi_code.ilike.%${search}%,narration.ilike.%${search}%,reference_number.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return serverError('Failed to load vouchers', error)
  return ok({ vouchers: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateVoucherSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { lines, ...voucherFields } = parsed.data
  const total_debit  = lines.filter(l => l.entry_type === 'DEBIT').reduce((s, l) => s + l.amount_paise, 0)
  const total_credit = lines.filter(l => l.entry_type === 'CREDIT').reduce((s, l) => s + l.amount_paise, 0)

  const zi_code = await nextVoucherCode()

  const { data: voucher, error: vErr } = await db.from('zlg_vouchers').insert({
    ...voucherFields,
    zi_code,
    entity_id:         entityId,
    subscription_id:   subscriptionId,
    voucher_date:      voucherFields.voucher_date ?? new Date().toISOString().split('T')[0],
    total_debit_paise:  total_debit,
    total_credit_paise: total_credit,
    created_by:        session.individual.id,
  }).select().single()

  if (vErr || !voucher) return serverError('Failed to create voucher', vErr)

  // Insert lines — trigger updates account balances
  const linesToInsert = lines.map((l, idx) => ({
    voucher_id:   voucher.id,
    account_id:   l.account_id,
    entity_id:    entityId,
    entry_type:   l.entry_type,
    amount_paise: l.amount_paise,
    narration:    l.narration ?? null,
    sort_order:   l.sort_order ?? idx,
  }))
  const { error: lErr } = await db.from('zlg_voucher_lines').insert(linesToInsert)
  if (lErr) return serverError('Failed to insert voucher lines', lErr)

  await writeAudit({ action: 'CREATE', table_name: 'zlg_vouchers', record_id: voucher.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, voucher_type: voucherFields.voucher_type, total_debit_paise: total_debit },
    ...extractRequestMeta(req) })

  return created({ ...voucher, lines: linesToInsert })
})
