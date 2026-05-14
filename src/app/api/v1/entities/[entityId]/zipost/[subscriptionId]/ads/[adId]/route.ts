// GET + PATCH + DELETE /…/ads/:adId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateAdSchema = z.object({
  title:         z.string().min(5).max(200).optional(),
  description:   z.string().max(2000).optional(),
  price_paise:   z.number().int().positive().optional(),
  is_negotiable: z.boolean().optional(),
  status:        z.enum(['ACTIVE','SOLD','REMOVED']).optional(),
  images:        z.array(z.string().url()).max(10).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, adId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zps_ads').select('*').eq('id', adId).single()
  if (error || !data) return notFound('Ad')

  // Increment view count
  db.from('zps_ads').update({ view_count: data.view_count + 1 }).eq('id', adId)

  // Only show contact mobile to the owner
  const isOwner = data.entity_id === entityId
  if (!isOwner) {
    // increment contact_view_count and mask mobile
    db.from('zps_ads').update({ contact_view_count: data.contact_view_count + 1 }).eq('id', adId)
    const { contact_mobile_hash, ...safeData } = data
    return ok({ ...safeData, contact_mobile_last4: data.contact_mobile_last4 })
  }

  const { contact_mobile_hash, ...safeData } = data
  return ok(safeData)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, adId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ad } = await db.from('zps_ads').select('id,entity_id,status').eq('id', adId).single()
  if (!ad) return notFound('Ad')
  if (ad.entity_id !== entityId) return conflict('Access denied')
  if (ad.status === 'REMOVED') return conflict('This ad has been removed')

  const parsed = UpdateAdSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zps_ads')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', adId).select().single()
  if (error || !data) return serverError('Failed to update ad', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zps_ads', record_id: adId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, adId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: ad } = await db.from('zps_ads').select('id,entity_id').eq('id', adId).single()
  if (!ad) return notFound('Ad')
  if (ad.entity_id !== entityId) return conflict('Access denied')

  await db.from('zps_ads').update({ status: 'REMOVED', updated_at: new Date().toISOString() }).eq('id', adId)
  return ok({ removed: true })
})
