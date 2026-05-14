// GET  /…/chits/:chitId/members
// POST /…/chits/:chitId/members
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddMemberSchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')

  const { data, error } = await db.from('zct_members')
    .select('id,name,mobile_last4,ticket_number,has_received_pot,received_at_cycle,is_active,joined_at')
    .eq('chit_id', chitId).order('ticket_number')
  if (error) return serverError('Failed to load members', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id,status,num_members').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')
  if (!['FORMING'].includes(chit.status))
    return conflict('Members can only be added while chit is in FORMING status')

  const parsed = AddMemberSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Validate ticket number range
  if (parsed.data.ticket_number > chit.num_members)
    return conflict(`Ticket number exceeds total seats (${chit.num_members})`)

  const { mobile, ...rest } = parsed.data
  const mobile_hash  = mobile ? createHash('sha256').update(mobile.trim()).digest('hex') : null
  const mobile_last4 = mobile ? mobile.slice(-4) : null

  const { data, error } = await db.from('zct_members').insert({
    ...rest,
    chit_id:     chitId,
    entity_id:   entityId,
    mobile_hash,
    mobile_last4,
  }).select().single()

  if (error?.code === '23505') return conflict('Ticket number already taken in this chit')
  if (error || !data) return serverError('Failed to add member', error)

  await writeAudit({ action: 'CREATE', table_name: 'zct_members', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { name: parsed.data.name, ticket_number: parsed.data.ticket_number },
    ...extractRequestMeta(req) })

  return created(data)
})
