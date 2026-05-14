// GET /…/ziledger/:subscriptionId/reports  — Balance Sheet, P&L, Trial Balance
// ?type=balance_sheet|profit_loss|trial_balance&date_to=YYYY-MM-DD
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const report_type = searchParams.get('type') ?? 'trial_balance'

  const { data: accounts, error } = await db.from('zlg_accounts')
    .select('id,zi_code,name,account_type,account_group,current_balance,opening_balance,is_active')
    .eq('entity_id', entityId).eq('is_active', true)
    .order('account_type').order('name')

  if (error) return serverError('Failed to load accounts', error)
  const accts = accounts ?? []

  if (report_type === 'trial_balance') {
    const trial = accts.map(a => ({
      zi_code:       a.zi_code,
      name:          a.name,
      account_type:  a.account_type,
      account_group: a.account_group,
      debit_balance:  a.current_balance > 0 && ['ASSET','EXPENSE'].includes(a.account_type) ? a.current_balance : 0,
      credit_balance: a.current_balance > 0 && ['LIABILITY','EQUITY','INCOME'].includes(a.account_type) ? a.current_balance : 0,
    }))
    const total_debit  = trial.reduce((s, r) => s + r.debit_balance, 0)
    const total_credit = trial.reduce((s, r) => s + r.credit_balance, 0)
    return ok({ report_type, trial, total_debit, total_credit, balanced: total_debit === total_credit })
  }

  if (report_type === 'balance_sheet') {
    const assets      = accts.filter(a => a.account_type === 'ASSET')
    const liabilities = accts.filter(a => a.account_type === 'LIABILITY')
    const equity      = accts.filter(a => a.account_type === 'EQUITY')
    const total_assets      = assets.reduce((s, a) => s + a.current_balance, 0)
    const total_liabilities = liabilities.reduce((s, a) => s + a.current_balance, 0)
    const total_equity      = equity.reduce((s, a) => s + a.current_balance, 0)
    return ok({ report_type, assets, liabilities, equity, total_assets, total_liabilities, total_equity,
      balanced: total_assets === total_liabilities + total_equity })
  }

  if (report_type === 'profit_loss') {
    const income   = accts.filter(a => a.account_type === 'INCOME')
    const expenses = accts.filter(a => a.account_type === 'EXPENSE')
    const total_income   = income.reduce((s, a) => s + a.current_balance, 0)
    const total_expenses = expenses.reduce((s, a) => s + a.current_balance, 0)
    const net_profit     = total_income - total_expenses
    return ok({ report_type, income, expenses, total_income, total_expenses, net_profit })
  }

  return validationError({ message: 'Unknown report type. Use trial_balance, balance_sheet, or profit_loss' } as any)
})
