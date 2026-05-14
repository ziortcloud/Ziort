// POST /…/listings/:listingId/enquire  — submit an enquiry on a listing
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const EnquirySchema = z.object({
  enquirer_name:   z.string().min(1).max(200),
  enquirer_mobile: z.string().regex(/^\d{10}$/).optional(),
  qty_needed:      z.number().positive().optional(),
  message:         z.string().max(500).optional(),
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, listingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: listing } = await db.from('zbd_listings')
    .select('id,entity_id,status').eq('id', listingId).single()
  if (!listing) return notFound('Listing')
  if (listing.status !== 'ACTIVE') return conflict('This listing is no longer active')
  if (listing.entity_id === entityId) return conflict('Cannot enquire on your own listing')

  const parsed = EnquirySchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zbd_enquiries').insert({
    listing_id:         listingId,
    entity_id:          listing.entity_id,   // owner of the listing
    enquirer_entity_id: entityId,
    enquirer_name:      parsed.data.enquirer_name,
    enquirer_mobile:    parsed.data.enquirer_mobile ?? null,
    qty_needed:         parsed.data.qty_needed ?? null,
    message:            parsed.data.message ?? null,
  }).select().single()

  if (error || !data) return serverError('Failed to submit enquiry', error)
  return created({ enquiry_id: data.id, message: 'Enquiry submitted successfully' })
})
