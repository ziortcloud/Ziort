// GET  /api/v1/entities/:entityId/zidriver/:subscriptionId/documents
// POST /api/v1/entities/:entityId/zidriver/:subscriptionId/documents
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, created, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { AddDocumentSchema } from '@/zidriver/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const doc_type    = searchParams.get('doc_type')
  const expiring    = searchParams.get('expiring_days')  // show docs expiring within N days

  let query = db.from('zdr_documents')
    .select('*')
    .eq('driver_entity_id', entityId)
    .order('created_at', { ascending: false })

  if (doc_type)  query = query.eq('doc_type', doc_type)
  if (expiring) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + Number(expiring))
    query = query.lte('expiry_date', cutoff.toISOString().split('T')[0])
                 .gte('expiry_date', new Date().toISOString().split('T')[0])
  }

  const { data, error } = await query
  if (error) return serverError('Failed to load documents', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: profile } = await db.from('zdr_profiles')
    .select('id').eq('entity_id', entityId).maybeSingle()
  if (!profile) return conflict('Create your ZiDriver profile before adding documents')

  const parsed = AddDocumentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: doc, error } = await db.from('zdr_documents').insert({
    ...parsed.data,
    driver_entity_id: entityId,
    subscription_id:  subscriptionId,
    created_by:       session.individual.id,
  }).select().single()

  if (error || !doc) return serverError('Failed to add document', error)
  return created(doc)
})
