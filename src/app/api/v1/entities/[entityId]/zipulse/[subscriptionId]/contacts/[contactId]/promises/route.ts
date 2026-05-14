// GET  /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/promises
// POST /api/v1/entities/:entityId/zipulse/:subscriptionId/contacts/:contactId/promises
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { nextPromiseCode, promiseRefCode } from '@/zipulse/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, notFound, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreatePromiseSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const isFulfilled = searchParams.get('is_fulfilled')
  const isBroken    = searchParams.get('is_broken')
  const direction   = searchParams.get('direction')

  let query = db.from('zipulse_promises')
    .select('*, zi_individuals!created_by ( id, display_name )', { count: 'exact' })
    .eq('contact_id', contactId).eq('entity_id', entityId)
    .order('due_at', { ascending: true }).range(offset, offset + limit - 1)

  if (isFulfilled !== null) query = query.eq('is_fulfilled', isFulfilled === 'true')
  if (isBroken    !== null) query = query.eq('is_broken', isBroken === 'true')
  if (direction)             query = query.eq('direction', direction)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load promises', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, contactId } = await ctx.params
  const sub = await requireSubscriptionAccess(session, subscriptionId)

  const { data: contact } = await db.from('zipulse_contacts')
    .select('id, zi_code, ref_code').eq('id', contactId).eq('subscription_id', subscriptionId).single()
  if (!contact) return notFound('Contact')

  const parsed = CreatePromiseSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { promise_type, direction, description, due_at, reminder_at, enquiry_id } = parsed.data

  const entity_zi = (await db.from('zi_entities').select('zi_code').eq('id', entityId).single()).data?.zi_code ?? ''
  const prm_code  = await nextPromiseCode()
  const ref_code  = promiseRefCode(entity_zi, sub.zi_code, contact.zi_code, prm_code)

  const { data: promise, error } = await db.from('zipulse_promises').insert({
    zi_code: prm_code, ref_code, entity_id: entityId, subscription_id: subscriptionId,
    contact_id: contactId, enquiry_id: enquiry_id ?? null,
    promise_type, direction, description,
    promised_by: session.individual.id,
    due_at, reminder_at: reminder_at ?? null,
    created_by: session.individual.id,
  }).select().single()

  if (error || !promise) return serverError('Failed to create promise', error)

  // DB trigger fn_zpulse_on_promise_insert handles total_promises on contact + enquiry automatically

  await writeAudit({ action: 'CREATE', table_name: 'zipulse_promises', record_id: promise.id, ref_code,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { prm_code, promise_type, direction, due_at }, ...extractRequestMeta(req) })

  return created(promise)
})
