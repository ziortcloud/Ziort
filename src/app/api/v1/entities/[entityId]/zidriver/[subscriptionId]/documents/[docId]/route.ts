// GET    /api/v1/entities/:entityId/zidriver/:subscriptionId/documents/:docId
// PATCH  /api/v1/entities/:entityId/zidriver/:subscriptionId/documents/:docId
// DELETE /api/v1/entities/:entityId/zidriver/:subscriptionId/documents/:docId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateDocumentSchema } from '@/zidriver/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doc, error } = await db.from('zdr_documents')
    .select('*').eq('id', docId).single()
  if (error || !doc) return notFound('Document')
  if (doc.driver_entity_id !== entityId) return conflict('Cannot access another driver\'s document')
  return ok(doc)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doc } = await db.from('zdr_documents')
    .select('id,driver_entity_id').eq('id', docId).single()
  if (!doc) return notFound('Document')
  if (doc.driver_entity_id !== entityId) return conflict('Cannot modify another driver\'s document')

  const parsed = UpdateDocumentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data: updated, error } = await db.from('zdr_documents')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', docId).select().single()

  if (error || !updated) return serverError('Failed to update document', error)
  return ok(updated)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doc } = await db.from('zdr_documents')
    .select('id,driver_entity_id').eq('id', docId).single()
  if (!doc) return notFound('Document')
  if (doc.driver_entity_id !== entityId) return conflict('Cannot delete another driver\'s document')

  const { error } = await db.from('zdr_documents').delete().eq('id', docId)
  if (error) return serverError('Failed to delete document', error)
  return ok({ deleted: true, id: docId })
})
