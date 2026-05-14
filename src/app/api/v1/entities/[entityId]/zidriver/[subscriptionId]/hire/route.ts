// POST /api/v1/entities/:entityId/zidriver/:subscriptionId/hire
// A hirer (ZiFleet operator, ZiLoad transporter, or any entity) makes a hire offer
// to a registered ZiDriver. Creates a zdr_engagements record with status OFFERED.
// The driver then sees it under their /engagements and can accept or reject.
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { MakeHireOfferSchema } from '@/zidriver/validators'
import { nextEngagementCode } from '@/zidriver/services/codes'

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = MakeHireOfferSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Cannot hire yourself
  if (parsed.data.driver_entity_id === entityId)
    return conflict('Cannot send a hire offer to yourself')

  // Verify target is a registered ZiDriver
  const { data: driverProfile } = await db.from('zdr_profiles')
    .select('id,is_active,availability_status')
    .eq('entity_id', parsed.data.driver_entity_id).maybeSingle()

  if (!driverProfile) return notFound('Driver — they must have a ZiDriver profile to receive offers')
  if (!driverProfile.is_active) return conflict('This driver\'s profile is inactive')
  if (driverProfile.availability_status === 'BUSY')
    return conflict('Driver is currently busy — check back later')

  // Block duplicate active offers from same hirer to same driver
  const { data: duplicate } = await db.from('zdr_engagements')
    .select('id').eq('hirer_entity_id', entityId)
    .eq('driver_entity_id', parsed.data.driver_entity_id)
    .in('status', ['OFFERED','ACCEPTED','IN_PROGRESS']).maybeSingle()
  if (duplicate) return conflict('You already have an active engagement with this driver')

  // Validate optional ZiFleet / ZiLoad back-links
  if (parsed.data.zft_trip_id) {
    const { data: trip } = await db.from('zft_trips')
      .select('id').eq('id', parsed.data.zft_trip_id).eq('entity_id', entityId).maybeSingle()
    if (!trip) return conflict('ZiFleet trip not found or not owned by your entity')
  }
  if (parsed.data.zld_booking_id) {
    const { data: booking } = await db.from('zld_bookings')
      .select('id').eq('id', parsed.data.zld_booking_id)
      .eq('transporter_entity_id', entityId).maybeSingle()
    if (!booking) return conflict('ZiLoad booking not found or not assigned to your entity')
  }

  const zi_code = await nextEngagementCode()
  const { driver_entity_id, ...offerData } = parsed.data

  const { data: engagement, error } = await db.from('zdr_engagements').insert({
    ...offerData,
    zi_code,
    hirer_entity_id:       entityId,
    hirer_subscription_id: subscriptionId,
    driver_entity_id,
    created_by:            session.individual.id,
  }).select().single()

  if (error || !engagement) return serverError('Failed to send hire offer', error)

  await writeAudit({ action: 'CREATE', table_name: 'zdr_engagements', record_id: engagement.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, driver_entity_id, engagement_type: parsed.data.engagement_type },
    ...extractRequestMeta(req) })

  return created(engagement)
})
