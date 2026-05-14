// GET  /…/chits/:chitId/auction  — all auction records
// POST /…/chits/:chitId/auction  — record cycle winner
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RecordAuctionSchema } from '@/zichit/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits').select('id,entity_id').eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')

  const { data, error } = await db.from('zct_auctions')
    .select(`
      id, cycle_number, bid_amount_paise, prize_amount_paise,
      foreman_charge_paise, disbursed_at, disbursement_mode, reference_number, notes,
      zct_members ( name, ticket_number )
    `)
    .eq('chit_id', chitId).order('cycle_number')
  if (error) return serverError('Failed to load auctions', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, chitId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: chit } = await db.from('zct_chits')
    .select('id,entity_id,status,chit_value_paise,foreman_charge_pct,duration_months')
    .eq('id', chitId).single()
  if (!chit) return notFound('Chit')
  if (chit.entity_id !== entityId) return conflict('Access denied')
  if (chit.status !== 'ACTIVE') return conflict('Chit must be ACTIVE to record auction results')

  const parsed = RecordAuctionSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  if (parsed.data.cycle_number > chit.duration_months)
    return conflict(`Cycle ${parsed.data.cycle_number} exceeds chit duration`)

  // Member must not have already won
  const { data: member } = await db.from('zct_members')
    .select('id,name,has_received_pot,chit_id').eq('id', parsed.data.member_id).eq('chit_id', chitId).single()
  if (!member) return notFound('Member in this chit')
  if (member.has_received_pot) return conflict(`${member.name} has already received the pot`)

  // Compute prize
  const foreman_charge_paise = Math.round(chit.chit_value_paise * (chit.foreman_charge_pct / 100))
  const prize_amount_paise   = chit.chit_value_paise - parsed.data.bid_amount_paise - foreman_charge_paise

  if (prize_amount_paise <= 0) return conflict('Bid amount leaves no prize for the winner')

  const { data: auction, error } = await db.from('zct_auctions').insert({
    chit_id:              chitId,
    member_id:            parsed.data.member_id,
    entity_id:            entityId,
    cycle_number:         parsed.data.cycle_number,
    bid_amount_paise:     parsed.data.bid_amount_paise,
    prize_amount_paise,
    foreman_charge_paise,
    disbursed_at:         parsed.data.disbursed_at ?? null,
    disbursement_mode:    parsed.data.disbursement_mode ?? null,
    reference_number:     parsed.data.reference_number ?? null,
    notes:                parsed.data.notes ?? null,
    created_by:           session.individual.id,
  }).select().single()

  if (error?.code === '23505') return conflict(`Auction already recorded for cycle ${parsed.data.cycle_number}`)
  if (error || !auction) return serverError('Failed to record auction', error)

  // Mark member as having received pot
  await db.from('zct_members').update({
    has_received_pot: true, received_at_cycle: parsed.data.cycle_number,
  }).eq('id', parsed.data.member_id)

  // Advance chit cycle counter
  await db.from('zct_chits').update({
    current_cycle: parsed.data.cycle_number,
    updated_at: new Date().toISOString(),
  }).eq('id', chitId)

  await writeAudit({ action: 'CREATE', table_name: 'zct_auctions', record_id: auction.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { cycle_number: parsed.data.cycle_number, prize_amount_paise, member_id: parsed.data.member_id },
    ...extractRequestMeta(req) })

  return created(auction)
})
