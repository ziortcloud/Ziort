// GET   /api/v1/entities/:entityId/zineed/:subscriptionId/proposals/:proposalId
// PATCH /api/v1/entities/:entityId/zineed/:subscriptionId/proposals/:proposalId
// PATCH: withdraw own proposal OR shortlist/reject (buyer of the requirement)
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, forbidden, badRequest, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateProposalSchema = z.object({
  status: z.enum(['shortlisted', 'rejected', 'withdrawn']),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, proposalId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: proposal, error } = await db
    .from('znd_proposals')
    .select('*, znd_requirements ( id, zi_code, title, entity_id, status )')
    .eq('id', proposalId)
    .single()

  if (error || !proposal) return notFound('Proposal')

  // Only the proposing entity or the requirement owner can view details
  const reqEntityId = (proposal.znd_requirements as any)?.entity_id
  if (proposal.entity_id !== entityId && reqEntityId !== entityId) {
    return forbidden('Access denied')
  }

  return ok(proposal)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, proposalId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: proposal } = await db
    .from('znd_proposals')
    .select('id, entity_id, status, ref_code, requirement_id')
    .eq('id', proposalId)
    .single()

  if (!proposal) return notFound('Proposal')
  if (['accepted', 'withdrawn', 'rejected'].includes(proposal.status)) {
    return badRequest(`Proposal already ${proposal.status}`)
  }

  const body = await req.json()
  const parsed = UpdateProposalSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { status } = parsed.data

  // Withdraw: only the proposing entity
  if (status === 'withdrawn' && proposal.entity_id !== entityId) {
    return forbidden('Only the proposing entity can withdraw')
  }

  // Shortlist/Reject: only the requirement owner
  if (['shortlisted', 'rejected'].includes(status)) {
    const { data: requirement } = await db
      .from('znd_requirements')
      .select('entity_id')
      .eq('id', proposal.requirement_id)
      .single()
    if (!requirement || requirement.entity_id !== entityId) {
      return forbidden('Only the requirement owner can shortlist or reject proposals')
    }
  }

  const { data: updated, error } = await db
    .from('znd_proposals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .select()
    .single()

  if (error || !updated) return serverError('Failed to update proposal', error)

  await writeAudit({
    action: 'UPDATE', table_name: 'znd_proposals',
    record_id: proposalId, ref_code: proposal.ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    old_value: { status: proposal.status },
    new_value: { status },
    ...extractRequestMeta(req),
  })

  return ok(updated)
})
