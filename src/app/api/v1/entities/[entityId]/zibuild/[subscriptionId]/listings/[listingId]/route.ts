// GET + PATCH + DELETE /…/listings/:listingId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateListingSchema = z.object({
  title:                 z.string().min(5).max(200).optional(),
  description:           z.string().max(2000).optional(),
  qty_available:         z.number().positive().optional(),
  rate_paise:            z.number().int().positive().optional(),
  delivery_available:    z.boolean().optional(),
  delivery_charge_paise: z.number().int().min(0).optional(),
  status:                z.enum(['ACTIVE','SOLD','EXPIRED','PAUSED']).optional(),
  images:                z.array(z.string().url()).max(10).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, listingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zbd_listings').select('*').eq('id', listingId).single()
  if (error || !data) return notFound('Listing')

  // Increment view count (fire and forget)
  db.from('zbd_listings').update({ view_count: data.view_count + 1 }).eq('id', listingId)

  return ok(data)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, listingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: listing } = await db.from('zbd_listings')
    .select('id,entity_id').eq('id', listingId).single()
  if (!listing) return notFound('Listing')
  if (listing.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateListingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zbd_listings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', listingId).select().single()
  if (error || !data) return serverError('Failed to update listing', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zbd_listings', record_id: listingId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, listingId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: listing } = await db.from('zbd_listings')
    .select('id,entity_id').eq('id', listingId).single()
  if (!listing) return notFound('Listing')
  if (listing.entity_id !== entityId) return conflict('Access denied')

  const { error } = await db.from('zbd_listings')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', listingId)
  if (error) return serverError('Failed to remove listing', error)

  return ok({ removed: true })
})
