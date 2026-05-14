// GET  /…/chits/:chitId/contributions
// POST /…/chits/:chitId/contributions  — record a member's monthly contribution
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordContributionSchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')

  const { searchParams } = new URL(req.url)
  const cycle  = searchParams.get('cycle')
  const member = searchParams.get('member_id')

  let query = db.from('zct_contributions')
    .select(`
      id, member_id, cycle_number, amount_paise, penalty_paise,
      payment_mode, reference_number, paid_date, notes, created_at,
      zct_members ( name, ticket_number )
    `)
    .eq('chit_id', chitId)
    .order('cycle_number')
    .order('paid_date')

  if (cycle)  query = query.eq('cycle_number', parseInt(cycle))
  if (member) query = query.eq('member_id', member)

  const { data, error } = await query
  if (error) return serverError('Failed to load contributions', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id,status,duration_months').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')
  if (chit.status !== 'ACTIVE')
    return conflict(`Cannot record contributions for a ${chit.status} chit — activate it first`)

  const parsed = RecordContributionSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.cycle_number > chit.duration_months)
    return conflict(`Cycle ${parsed.data.cycle_number} exceeds chit duration (${chit.duration_months} months)`)

  // Verify member belongs to this chit
  const { data: member } = await db.from('zct_members')
    .select('id,chit_id').eq('id', parsed.data.member_id).eq('chit_id', chitId).single()
  if (!member) return notFound('Member in this chit')

  const { data, error } = await db.from('zct_contributions').insert({
    chit_id:          chitId,
    entity_id:        entityId,
    member_id:        parsed.data.member_id,
    cycle_number:     parsed.data.cycle_number,
    amount_paise:     parsed.data.amount_paise,
    payment_mode:     parsed.data.payment_mode ?? 'CASH',
    reference_number: parsed.data.reference_number ?? null,
    paid_date:        parsed.data.paid_date ?? new Date().toISOString().split('T')[0],
    penalty_paise:    parsed.data.penalty_paise ?? 0,
    notes:            parsed.data.notes ?? null,
    created_by:       session.individual.id,
  }).select().single()

  if (error?.code === '23505')
    return conflict(`Contribution already recorded for member in cycle ${parsed.data.cycle_number}`)
  if (error || !data) return serverError('Failed to record contribution', error)

  await writeAudit({ action: 'CREATE', table_name: 'zct_contributions', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { cycle_number: parsed.data.cycle_number, amount_paise: parsed.data.amount_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
