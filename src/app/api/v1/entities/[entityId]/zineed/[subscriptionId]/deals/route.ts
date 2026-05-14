// GET  /api/v1/entities/:entityId/zineed/:subscriptionId/deals
// POST /api/v1/entities/:entityId/zineed/:subscriptionId/deals
// POST = accept a proposal → creates a deal, marks requirement as deal_closed
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextDealCode, dealRefCode } from '@/zineed/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, badRequest, notFound, forbidden, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { AcceptProposalSchema } from '@/zineed/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const role   = searchParams.get('role')    // 'buyer' | 'seller'

  let query = db
    .from('znd_deals')
    .select(`
      *,
      znd_requirements ( id, zi_code, title, category ),
      znd_proposals    ( id, zi_code, price_paise, delivery_days )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'seller') {
    query = query.eq('seller_entity_id', entityId)
  } else {
    query = query.eq('buyer_entity_id', entityId)
  }

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load deals', error)

  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const body = await req.json()
  const parsed = AcceptProposalSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { proposal_id, agreed_delivery_date } = parsed.data

  // Load proposal + requirement in one shot
  const { data: proposal } = await db
    .from('znd_proposals')
    .select('*, znd_requirements ( id, entity_id, status, zi_code )')
    .eq('id', proposal_id)
    .single()

  if (!proposal) return notFound('Proposal')

  const requirement = proposal.znd_requirements as any
  if (!requirement) return notFound('Requirement')

  // Only the requirement owner (buyer) can accept
  if (requirement.entity_id !== entityId) return forbidden('Only the requirement owner can accept proposals')

  if (!['published','proposals_received','matching'].includes(requirement.status)) {
    return badRequest(`Cannot accept proposal — requirement is ${requirement.status}`)
  }
  if (proposal.status === 'withdrawn' || proposal.status === 'rejected') {
    return badRequest(`Cannot accept a ${proposal.status} proposal`)
  }

  const entity_zi  = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const deal_code  = await nextDealCode()
  const ref_code   = dealRefCode(entity_zi, sub.zi_code, deal_code)

  const { data: deal, error } = await db
    .from('znd_deals')
    .insert({
      zi_code:               deal_code,
      ref_code,
      buyer_entity_id:       entityId,
      seller_entity_id:      proposal.entity_id,
      requirement_id:        proposal.requirement_id,
      proposal_id,
      agreed_price_paise:    proposal.price_paise,
      agreed_delivery_date,
    })
    .select()
    .single()

  if (error || !deal) return serverError('Failed to create deal', error)

  // Update proposal → accepted; requirement → deal_closed
  await db.from('znd_proposals').update({ status: 'accepted' }).eq('id', proposal_id)
  await db.from('znd_requirements').update({ status: 'deal_closed' }).eq('id', proposal.requirement_id)

  await writeAudit({
    action: 'CREATE', table_name: 'znd_deals',
    record_id: deal.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { deal_code, proposal_id, agreed_price_paise: proposal.price_paise },
    ...extractRequestMeta(req),
  })

  return created(deal)
})
