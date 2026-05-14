// GET + POST /…/ziscan/:subscriptionId/documents
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextDocumentCode } from '@/ziscan/services/codes'

const DOC_TYPES = ['INVOICE','RECEIPT','CONTRACT','ID_PROOF','PAN','AADHAAR','GSTIN','BANK_STATEMENT','RENT_AGREEMENT','OTHER'] as const

const CreateDocumentSchema = z.object({
  document_type:   z.enum(DOC_TYPES).optional(),
  title:           z.string().min(1).max(300),
  description:     z.string().max(500).optional(),
  file_url:        z.string().url(),
  file_name:       z.string().min(1).max(300),
  file_size_bytes: z.number().int().positive().optional(),
  mime_type:       z.string().max(100).optional(),
  page_count:      z.number().int().min(1).optional(),
  thumbnail_url:   z.string().url().optional(),
  source:          z.enum(['UPLOAD','CAMERA','EMAIL','WHATSAPP']).optional(),
  tags:            z.array(z.string().max(50)).max(20).optional(),
  ocr_text:        z.string().optional(),              // pre-extracted text (if client-side OCR)
  extracted_data:  z.record(z.any()).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const doc_type   = searchParams.get('type')
  const ocr_status = searchParams.get('ocr_status')
  const search     = searchParams.get('q')
  const archived   = searchParams.get('archived') === 'true'

  let query = db.from('zsc_documents')
    .select('id,zi_code,document_type,title,file_name,mime_type,page_count,thumbnail_url,ocr_status,ocr_confidence,source,tags,is_archived,created_at',
      { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('is_archived', archived)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (doc_type)   query = query.eq('document_type', doc_type)
  if (ocr_status) query = query.eq('ocr_status', ocr_status)
  if (search)     query = query.ilike('title', `%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load documents', error)
  return ok({ documents: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateDocumentSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextDocumentCode()
  const has_ocr_text = !!parsed.data.ocr_text

  const { data, error } = await db.from('zsc_documents').insert({
    ...parsed.data,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    ocr_status:      has_ocr_text ? 'DONE' : 'PENDING',
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to save document', error)

  // If no OCR text provided, queue an async scan job
  if (!has_ocr_text) {
    await db.from('zsc_scan_jobs').insert({
      document_id: data.id,
      entity_id:   entityId,
      provider:    'INTERNAL',
    })
  }

  await writeAudit({ action: 'CREATE', table_name: 'zsc_documents', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, title: parsed.data.title, document_type: parsed.data.document_type },
    ...extractRequestMeta(req) })

  return created(data)
})
