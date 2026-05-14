// GET   /…/vouchers/:voucherId  — voucher + lines
// PATCH /…/vouchers/:voucherId  — cancel only
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { CancelVoucherSchema } from '@/ziledger/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, voucherId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const [vResult, lResult] = await Promise.all([
    db.from('zlg_vouchers').select('*').eq('id', voucherId).single(),
    db.from('zlg_voucher_lines')
      .select('*, zlg_accounts ( name, account_type )')
      .eq('voucher_id', voucherId).order('sort_order'),
  ])

  if (vResult.error || !vResult.data) return notFound('Voucher')
  if (vResult.data.entity_id !== entityId) return conflict('Access denied')

  return ok({ ...vResult.data, lines: lResult.data ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, voucherId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: voucher } = await db.from('zlg_vouchers')
    .select('id,entity_id,status').eq('id', voucherId).single()
  if (!voucher) return notFound('Voucher')
  if (voucher.entity_id !== entityId) return conflict('Access denied')
  if (voucher.status === 'CANCELLED') return conflict('Voucher is already cancelled')

  const parsed = CancelVoucherSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Reverse account balance effects by reversing each line
  const { data: lines } = await db.from('zlg_voucher_lines')
    .select('account_id,entry_type,amount_paise').eq('voucher_id', voucherId)

  for (const line of lines ?? []) {
    const { data: acct } = await db.from('zlg_accounts')
      .select('account_type,current_balance').eq('id', line.account_id).maybeSingle()
    if (!acct) continue
    const isNormalDebit = ['ASSET','EXPENSE'].includes(acct.account_type)
    const debitEffect   = isNormalDebit ? line.amount_paise : -line.amount_paise
    const creditEffect  = isNormalDebit ? -line.amount_paise : line.amount_paise
    const reversal      = line.entry_type === 'DEBIT' ? -debitEffect : -creditEffect

    await db.from('zlg_accounts').update({
      current_balance: acct.current_balance + reversal,
      updated_at:      new Date().toISOString(),
    }).eq('id', line.account_id)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await db.from('zlg_vouchers').update({
    status:        'CANCELLED',
    cancelled_at:  now,
    cancel_reason: parsed.data.cancel_reason,
    updated_at:    now,
  }).eq('id', voucherId).select().single()
  if (error || !updated) return serverError('Failed to cancel voucher', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zlg_vouchers', record_id: voucherId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { status: 'CANCELLED', cancel_reason: parsed.data.cancel_reason },
    ...extractRequestMeta(req) })

  return ok({ cancelled: true, voucher: updated })
})
