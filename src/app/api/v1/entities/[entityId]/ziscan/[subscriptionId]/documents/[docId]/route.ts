// GET + PATCH + DELETE /…/documents/:docId
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const UpdateDocumentSchema = z.object({
  title:          z.string().min(1).max(300).optional(),
  description:    z.string().max(500).optional(),
  document_type:  z.string().optional(),
  tags:           z.array(z.string().max(50)).max(20).optional(),
  thumbnail_url:  z.string().url().optional(),
  is_archived:    z.boolean().optional(),
  // OCR update (from scan job completion)
  ocr_status:     z.enum(['PENDING','PROCESSING','DONE','FAILED']).optional(),
  ocr_text:       z.string().optional(),
  ocr_confidence: z.number().min(0).max(100).optional(),
  extracted_data: z.record(z.any()).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zsc_documents').select('*').eq('id', docId).single()
  if (error || !data) return notFound('Document')
  if (data.entity_id !== entityId) return conflict('Access denied')

  // Also fetch scan jobs
  const { data: jobs } = await db.from('zsc_scan_jobs')
    .select('id,provider,status,started_at,completed_at,error_message')
    .eq('document_id', docId).order('created_at', { ascending: false })

  return ok({ ...data, scan_jobs: jobs ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doc } = await db.from('zsc_documents')
    .select('id,entity_id').eq('id', docId).single()
  if (!doc) return notFound('Document')
  if (doc.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateDocumentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { data, error } = await db.from('zsc_documents')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', docId).select().single()
  if (error || !data) return serverError('Failed to update document', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsc_documents', record_id: docId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: parsed.data, ...extractRequestMeta(req) })

  return ok(data)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, docId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: doc } = await db.from('zsc_documents')
    .select('id,entity_id').eq('id', docId).single()
  if (!doc) return notFound('Document')
  if (doc.entity_id !== entityId) return conflict('Access denied')

  // Soft-archive only — don't delete storage files from here
  const { error } = await db.from('zsc_documents')
    .update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', docId)
  if (error) return serverError('Failed to archive document', error)

  return ok({ archived: true })
})
