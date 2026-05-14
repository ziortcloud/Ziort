// GET + POST /…/farms/:farmId/expenses
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const PAYMENT_MODES = ['CASH','UPI','BANK','OTHER'] as const
const CATEGORIES    = ['SEED','FERTILIZER','PESTICIDE','LABOUR','IRRIGATION','EQUIPMENT','TRANSPORT','OTHER'] as const

const CreateExpenseSchema = z.object({
  crop_id:          z.string().uuid().optional(),
  expense_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category:         z.enum(CATEGORIES),
  description:      z.string().min(1).max(300),
  amount_paise:     z.number().int().positive(),
  payment_mode:     z.enum(PAYMENT_MODES).optional(),
  reference_number: z.string().max(100).optional(),
  vendor_name:      z.string().max(200).optional(),
  notes:            z.string().max(400).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, farmId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: farm } = await db.from('zyl_farms').select('id,entity_id').eq('id', farmId).single()
  if (!farm) return notFound('Farm')
  if (farm.entity_id !== entityId) return conflict('Access denied')

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const crop_id  = searchParams.get('crop_id')
  const category = searchParams.get('category')

  let query = db.from('zyl_expenses')
    .select('*', { count: 'exact' })
    .eq('farm_id', farmId)
    .order('expense_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (crop_id)  query = query.eq('crop_id', crop_id)
  if (category) query = query.eq('category', category)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load expenses', error)

  // Aggregate totals
  const { data: totals } = await db.from('zyl_expenses')
    .select('amount_paise').eq('farm_id', farmId)
  const total_paise = (totals ?? []).reduce((s, e) => s + e.amount_paise, 0)

  return ok({ expenses: data ?? [], total: count ?? 0, total_paise, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, farmId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: farm } = await db.from('zyl_farms').select('id,entity_id').eq('id', farmId).single()
  if (!farm) return notFound('Farm')
  if (farm.entity_id !== entityId) return conflict('Access denied')

  const parsed = CreateExpenseSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zyl_expenses').insert({
    ...parsed.data,
    entity_id:    entityId,
    farm_id:      farmId,
    expense_date: parsed.data.expense_date ?? new Date().toISOString().split('T')[0],
    payment_mode: parsed.data.payment_mode ?? 'CASH',
    created_by:   session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to record expense', error)

  await writeAudit({ action: 'CREATE', table_name: 'zyl_expenses', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { category: parsed.data.category, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
