// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/expenses
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/trips/:tripId/expenses
// Trigger fn_zft_on_expense_insert updates trip.expense_paise + vehicle.total_expense_paise
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { LogExpenseSchema } from '@/zifleet/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,expense_paise').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')

  const { data: expenses, error } = await db.from('zft_expenses')
    .select('*').eq('trip_id', tripId).order('logged_at', { ascending: false })

  if (error) return serverError('Failed to load expenses', error)
  return ok({ expenses: expenses ?? [], total_paise: trip.expense_paise })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, tripId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: trip } = await db.from('zft_trips')
    .select('id,status,vehicle_id').eq('id', tripId).eq('entity_id', entityId).single()
  if (!trip) return notFound('Trip')
  if (['CLOSED','CANCELLED'].includes(trip.status)) return conflict(`Cannot add expense — trip is ${trip.status}`)

  const parsed = LogExpenseSchema.safeParse({ ...await req.json(), trip_id: tripId, vehicle_id: trip.vehicle_id })
  if (!parsed.success) return validationError(parsed.error)

  const { data: expense, error } = await db.from('zft_expenses').insert({
    ...parsed.data,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    logged_by:       session.individual.id,
  }).select().single()

  if (error || !expense) return serverError('Failed to log expense', error)

  // DB trigger fn_zft_on_expense_insert updates trip.expense_paise

  await writeAudit({ action: 'CREATE', table_name: 'zft_expenses', record_id: expense.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { trip_id: tripId, category: parsed.data.category, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(expense)
})
