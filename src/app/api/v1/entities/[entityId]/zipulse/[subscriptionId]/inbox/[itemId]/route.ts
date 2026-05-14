// GET   /api/v1/entities/:entityId/zipulse/:subscriptionId/inbox/:itemId
// PATCH /api/v1/entities/:entityId/zipulse/:subscriptionId/inbox/:itemId
// PATCH converts an inbox item to a contact, enquiry, followup, or archives it
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { ok, notFound, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { ConvertInboxSchema } from '@/zipulse/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: item, error } = await db.from('zipulse_inbox')
    .select('*, zi_individuals!captured_by ( id, display_name )')
    .eq('id', itemId).eq('entity_id', entityId).eq('subscription_id', subscriptionId).single()
  if (error || !item) return notFound('Inbox item')
  return ok(item)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, itemId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: item } = await db.from('zipulse_inbox')
    .select('id, status, content').eq('id', itemId).eq('entity_id', entityId).single()
  if (!item) return notFound('Inbox item')

  const parsed = ConvertInboxSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { converted_to, contact_id, enquiry_id } = parsed.data
  const now = new Date().toISOString()

  let converted_ref: string | null = null

  if (converted_to === 'archived') {
    const { data: updated, error } = await db.from('zipulse_inbox')
      .update({ status: 'archived', converted_to: 'archived', converted_at: now })
      .eq('id', itemId).select().single()
    if (error || !updated) return serverError('Failed to archive item', error)
    return ok(updated)
  }

  // Attach as thread note on an existing contact
  if (converted_to === 'note' && contact_id) {
    const { data: contact } = await db.from('zipulse_contacts')
      .select('id, zi_code').eq('id', contact_id).eq('subscription_id', subscriptionId).single()
    if (contact) {
      await db.from('zipulse_threads').insert({
        zi_code: `INB-${itemId.slice(0, 8)}`, ref_code: `INB-${contact.zi_code}-${itemId.slice(0, 8)}`,
        entity_id: entityId, subscription_id: subscriptionId,
        contact_id, entry_type: 'note', content: item.content,
        created_by: session.individual.id,
      })
      converted_ref = contact.zi_code
    }
  }

  // Attach as thread note on an enquiry's contact
  if (converted_to === 'enquiry' && enquiry_id) {
    const { data: enquiry } = await db.from('zipulse_enquiries')
      .select('id, ref_code, contact_id').eq('id', enquiry_id).eq('subscription_id', subscriptionId).single()
    if (enquiry) {
      await db.from('zipulse_threads').insert({
        zi_code: `INB-${itemId.slice(0, 8)}`, ref_code: `INB-ENQ-${itemId.slice(0, 8)}`,
        entity_id: entityId, subscription_id: subscriptionId,
        contact_id: enquiry.contact_id, enquiry_id,
        entry_type: 'note', content: item.content,
        created_by: session.individual.id,
      })
      converted_ref = enquiry.ref_code
    }
  }

  const { data: updated, error } = await db.from('zipulse_inbox')
    .update({
      status: 'converted', converted_to, converted_ref,
      converted_at: now,
    }).eq('id', itemId).select().single()

  if (error || !updated) return serverError('Failed to convert inbox item', error)
  return ok(updated)
})
