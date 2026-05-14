// GET  /…/zichit/:subscriptionId/chits
// POST /…/zichit/:subscriptionId/chits
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateChitSchema } from '@/zichit/validators'
import { nextChitCode } from '@/zichit/services/codes'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db.from('zct_chits')
    .select('id,zi_code,name,chit_value_paise,num_members,current_cycle,status,start_date,end_date,created_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load chits', error)
  return ok({ chits: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateChitSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const monthly_contribution_paise = Math.round(
    parsed.data.chit_value_paise / parsed.data.num_members
  )

  // Compute end_date: start_date + duration_months
  const startDate = new Date(parsed.data.start_date)
  startDate.setMonth(startDate.getMonth() + parsed.data.duration_months)
  const end_date = startDate.toISOString().split('T')[0]

  const zi_code = await nextChitCode()

  const { data, error } = await db.from('zct_chits').insert({
    ...parsed.data,
    zi_code,
    entity_id:                entityId,
    subscription_id:          subscriptionId,
    monthly_contribution_paise,
    end_date,
    created_by:               session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create chit', error)

  await writeAudit({ action: 'CREATE', table_name: 'zct_chits', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name, chit_value_paise: parsed.data.chit_value_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
