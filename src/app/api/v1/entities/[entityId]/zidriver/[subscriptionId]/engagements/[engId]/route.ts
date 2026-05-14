// GET   /api/v1/entities/:entityId/zidriver/:subscriptionId/engagements/:engId
// PATCH /api/v1/entities/:entityId/zidriver/:subscriptionId/engagements/:engId
// PATCH actions via query param:
//   ?action=respond  — driver accepts or rejects offer (RespondEngagementSchema)
//   ?action=start    — hirer marks engagement started
//   ?action=complete — hirer marks completed (with optional actual_km)
//   ?action=cancel   — either party cancels
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { RespondEngagementSchema, UpdateEngagementSchema } from '@/zidriver/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, engId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: eng, error } = await db.from('zdr_engagements')
    .select(`
      *,
      hirer:zi_entities!zdr_engagements_hirer_entity_id_fkey ( id, name ),
      driver:zi_entities!zdr_engagements_driver_entity_id_fkey ( id, name ),
      driver_profile:zdr_profiles!zdr_engagements_driver_entity_id_fkey ( full_name, avg_rating, total_trips )
    `)
    .eq('id', engId).single()

  if (error || !eng) return notFound('Engagement')

  const isParty = eng.hirer_entity_id === entityId || eng.driver_entity_id === entityId
  if (!isParty) return conflict('You are not a party to this engagement')

  return ok(eng)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, engId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') // respond | start | complete | cancel

  const { data: eng } = await db.from('zdr_engagements')
    .select('id,status,hirer_entity_id,driver_entity_id').eq('id', engId).single()
  if (!eng) return notFound('Engagement')

  const isHirer  = eng.hirer_entity_id  === entityId
  const isDriver = eng.driver_entity_id === entityId
  if (!isHirer && !isDriver) return conflict('You are not a party to this engagement')

  const now = new Date().toISOString()

  // ─── DRIVER RESPONDS (accept / reject) ───
  if (action === 'respond') {
    if (!isDriver) return conflict('Only the driver can accept or reject an offer')
    if (eng.status !== 'OFFERED') return conflict(`Cannot respond — engagement is ${eng.status}`)

    const parsed = RespondEngagementSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const update = parsed.data.action === 'accept'
      ? { status: 'ACCEPTED', accept_note: parsed.data.accept_note ?? null, updated_at: now }
      : { status: 'REJECTED', reject_reason: parsed.data.reject_reason ?? null, updated_at: now }

    if (parsed.data.action === 'accept') {
      // Mark driver as BUSY
      await db.from('zdr_profiles')
        .update({ availability_status: 'BUSY', updated_at: now })
        .eq('entity_id', entityId)
    }

    const { data: updated, error } = await db.from('zdr_engagements')
      .update(update).eq('id', engId).select().single()
    if (error || !updated) return serverError('Failed to respond to engagement', error)
    return ok(updated)
  }

  // ─── HIRER STARTS ───
  if (action === 'start') {
    if (!isHirer) return conflict('Only the hirer can mark an engagement as started')
    if (eng.status !== 'ACCEPTED') return conflict(`Cannot start — engagement is ${eng.status}`)

    const { data: updated, error } = await db.from('zdr_engagements')
      .update({ status: 'IN_PROGRESS', started_at: now, updated_at: now })
      .eq('id', engId).select().single()
    if (error || !updated) return serverError('Failed to start engagement', error)
    return ok(updated)
  }

  // ─── HIRER COMPLETES ───
  if (action === 'complete') {
    if (!isHirer) return conflict('Only the hirer can mark an engagement as completed')
    if (eng.status !== 'IN_PROGRESS') return conflict(`Cannot complete — engagement is ${eng.status}`)

    const body = await req.json().catch(() => ({}))
    const actual_km = typeof body.actual_km === 'number' ? body.actual_km : null

    const { data: updated, error } = await db.from('zdr_engagements')
      .update({ status: 'COMPLETED', completed_at: now, actual_km, updated_at: now })
      .eq('id', engId).select().single()
    if (error || !updated) return serverError('Failed to complete engagement', error)

    // Driver is now available again
    await db.from('zdr_profiles')
      .update({ availability_status: 'AVAILABLE', updated_at: now })
      .eq('entity_id', eng.driver_entity_id)

    await writeAudit({ action: 'UPDATE', table_name: 'zdr_engagements', record_id: engId,
      entity_id: entityId, individual_id: session.individual.id,
      new_value: { status: 'COMPLETED', actual_km }, ...extractRequestMeta(req) })

    return ok(updated)
  }

  // ─── CANCEL ───
  if (action === 'cancel') {
    if (!['OFFERED','ACCEPTED','IN_PROGRESS'].includes(eng.status))
      return conflict(`Cannot cancel — engagement is ${eng.status}`)

    const body = await req.json().catch(() => ({}))
    const cancel_reason = body.cancel_reason ?? null

    const { data: updated, error } = await db.from('zdr_engagements')
      .update({ status: 'CANCELLED', cancel_reason, updated_at: now })
      .eq('id', engId).select().single()
    if (error || !updated) return serverError('Failed to cancel engagement', error)

    // Restore driver availability if they were BUSY
    if (['ACCEPTED','IN_PROGRESS'].includes(eng.status)) {
      await db.from('zdr_profiles')
        .update({ availability_status: 'AVAILABLE', updated_at: now })
        .eq('entity_id', eng.driver_entity_id)
    }

    return ok(updated)
  }

  return conflict('Unknown action. Use ?action=respond|start|complete|cancel')
})
