// GET  /api/v1/entities/:entityId/zineed/:subscriptionId/proposals
// POST /api/v1/entities/:entityId/zineed/:subscriptionId/proposals
// GET lists proposals FROM this entity (as supplier)
// POST submits a new proposal on a requirement
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextProposalCode } from '@/zineed/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, badRequest, notFound, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateProposalSchema } from '@/zineed/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db
    .from('znd_proposals')
    .select(`
      *, znd_requirements ( id, zi_code, title, category, status, expires_at )
    `, { count: 'exact' })
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load proposals', error)

  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const body = await req.json()
  const parsed = CreateProposalSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { requirement_id, price_paise, delivery_days, notes } = parsed.data

  // Load requirement and validate state
  const { data: requirement } = await db
    .from('znd_requirements')
    .select('id, zi_code, entity_id, status, expires_at')
    .eq('id', requirement_id)
    .single()

  if (!requirement) return notFound('Requirement')
  if (!['published', 'matching', 'proposals_received'].includes(requirement.status)) {
    return badRequest(`Cannot propose on a ${requirement.status} requirement`)
  }
  if (new Date(requirement.expires_at) < new Date()) {
    return badRequest('This requirement has expired')
  }
  if (requirement.entity_id === entityId) {
    return badRequest('Cannot propose on your own requirement')
  }

  // Prevent duplicate active proposal from same entity
  const { data: existing } = await db
    .from('znd_proposals')
    .select('id, zi_code')
    .eq('requirement_id', requirement_id)
    .eq('entity_id', entityId)
    .not('status', 'in', '("withdrawn","rejected")')
    .maybeSingle()

  if (existing) return conflict(`You already have an active proposal (${existing.zi_code}) on this requirement`)

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const pro_code  = await nextProposalCode()
  const ref_code  = `${entity_zi}${sub.zi_code}${pro_code}`

  const { data: proposal, error } = await db
    .from('znd_proposals')
    .insert({
      zi_code:         pro_code,
      ref_code,
      entity_id:       entityId,
      subscription_id: subscriptionId,
      requirement_id,
      proposed_by:     session.individual.id,
      price_paise,
      delivery_days,
      notes:           notes ?? null,
    })
    .select()
    .single()

  if (error || !proposal) return serverError('Failed to submit proposal', error)

  // Update requirement status to proposals_received
  await db.from('znd_requirements').update({ status: 'proposals_received' }).eq('id', requirement_id)

  await writeAudit({
    action: 'CREATE', table_name: 'znd_proposals',
    record_id: proposal.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { pro_code, requirement_id, price_paise, delivery_days },
    ...extractRequestMeta(req),
  })

  return created(proposal)
})
