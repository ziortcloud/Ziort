// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/threads
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/threads
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextThreadCode, threadRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateThreadSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const entryType = searchParams.get('type')

  let query = db.from('zipulse_threads')
    .select('*, zi_individuals!created_by ( id, display_name )', { count: 'exact' })
    .eq('contact_id', contactId).eq('entity_id', entityId)
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  if (entryType) query = query.eq('entry_type', entryType)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load thread', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  // Verify contact belongs to this subscription
  const { data: contact } = await db.from('zipulse_contacts')
    .select('id, zi_code, ref_code').eq('id', contactId).eq('subscription_id', subscriptionId).single()
  if (!contact) return notFound('Contact')

  const parsed = CreateThreadSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { entry_type, content, voice_url, file_url, file_name, file_type, is_private, enquiry_id, meeting_id } = parsed.data

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const thr_code  = await nextThreadCode()
  const ref_code  = threadRefCode(entity_zi, sub.zi_code, contact.zi_code, thr_code)

  const { data: thread, error } = await db.from('zipulse_threads').insert({
    zi_code: thr_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    contact_id: contactId, enquiry_id: enquiry_id ?? null, meeting_id: meeting_id ?? null,
    entry_type, content: content ?? null, voice_url: voice_url ?? null,
    file_url: file_url ?? null, file_name: file_name ?? null, file_type: file_type ?? null,
    is_private: is_private ?? false, created_by: session.individual.id,
  }).select().single()

  if (error || !thread) return serverError('Failed to add thread entry', error)

  // DB trigger fn_zpulse_on_thread_insert handles total_threads + last_contact_at automatically

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_threads', record_id: thread.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { thr_code, entry_type }, ...extractRequestMeta(req) })

  return created(thread)
})
