// GET  /api/v1/entities/:entityId/zireceipt/:subscriptionId/receipts
// POST /api/v1/entities/:entityId/zireceipt/:subscriptionId/receipts
// GET — all receipts (from invoice payments + standalone)
// POST — create a standalone receipt (advance, refund, deposit, etc.)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateReceiptSchema } from '@/zireceipt/validators'
import { nextReceiptCode } from '@/zireceipt/services/codes'
import { amountInWords } from '@/zidocs/services/amount-words'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const receipt_type = searchParams.get('type')
  const status       = searchParams.get('status') ?? 'ACTIVE'
  const search       = searchParams.get('q')

  let query = db.from('zrcp_receipts')
    .select(`
      id, zi_code, receipt_type, payer_name, receipt_date,
      amount_paise, payment_mode, status, invoice_id, created_at
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('receipt_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)       query = query.eq('status', status)
  if (receipt_type) query = query.eq('receipt_type', receipt_type)
  if (search)       query = query.or(
    `payer_name.ilike.%${search}%,zi_code.ilike.%${search}%,reference_number.ilike.%${search}%`
  )

  const { data, count, error } = await query
  if (error) return serverError('Failed to load receipts', error)
  return ok({ receipts: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateReceiptSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Standalone receipts cannot be type INVOICE_PAYMENT (that's auto-created)
  if (parsed.data.receipt_type === 'INVOICE_PAYMENT')
    return serverError('INVOICE_PAYMENT receipts are auto-created when recording invoice payments', null)

  const zi_code = await nextReceiptCode()

  const { data: receipt, error } = await db.from('zrcp_receipts').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    receipt_date:    parsed.data.receipt_date ?? new Date().toISOString().split('T')[0],
    amount_words:    amountInWords(parsed.data.amount_paise),
    created_by:      session.individual.id,
  }).select().single()

  if (error || !receipt) return serverError('Failed to create receipt', error)

  await writeAudit({ action: 'CREATE', table_name: 'zrcp_receipts', record_id: receipt.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, payer_name: parsed.data.payer_name, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(receipt)
})
