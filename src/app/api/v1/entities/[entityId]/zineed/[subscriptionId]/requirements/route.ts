// GET  /api/v1/entities/:entityId/zineed/:subscriptionId/requirements
// POST /api/v1/entities/:entityId/zineed/:subscriptionId/requirements
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextRequirementCode, requirementRefCode } from '@/zineed/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateRequirementSchema } from '@/zineed/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const category  = searchParams.get('category')
  const myOnly    = searchParams.get('my') === 'true'

  let query = db
    .from('znd_requirements')
    .select('*', { count: 'exact' })
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (myOnly)   query = query.eq('entity_id', entityId)

  // Hide expired by default
  if (!status) query = query.neq('status', 'expired')

  const { data, count, error } = await query
  if (error) return serverError('Failed to load requirements', error)

  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const body = await req.json()
  const parsed = CreateRequirementSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const {
    title, description, category, sub_category,
    quantity, unit, budget_min_paise, budget_max_paise,
    location_city, location_state, delivery_date,
    is_urgent, is_anonymous, expires_days,
  } = parsed.data

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const req_code  = await nextRequirementCode()
  const ref_code  = requirementRefCode(entity_zi, sub.zi_code, req_code)

  const expires_at = new Date(Date.now() + (expires_days ?? 30) * 86400000).toISOString().slice(0, 10)

  const { data: requirement, error } = await db
    .from('znd_requirements')
    .insert({
      zi_code:          req_code,
      ref_code,
      entity_id:        entityId,
      subscription_id:  subscriptionId,
      posted_by:        session.individual.id,
      title,
      description,
      category,
      sub_category:     sub_category ?? null,
      quantity:         quantity ?? null,
      unit:             unit ?? null,
      budget_min_paise: budget_min_paise ?? null,
      budget_max_paise: budget_max_paise ?? null,
      location_city:    location_city ?? null,
      location_state:   location_state ?? null,
      delivery_date:    delivery_date ?? null,
      is_urgent:        is_urgent ?? false,
      is_anonymous:     is_anonymous ?? false,
      expires_at,
    })
    .select()
    .single()

  if (error || !requirement) return serverError('Failed to create requirement', error)

  await writeAudit({
    action: 'CREATE', table_name: 'znd_requirements',
    record_id: requirement.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { req_code, title, category, expires_at },
    ...extractRequestMeta(req),
  })

  return created(requirement)
})
