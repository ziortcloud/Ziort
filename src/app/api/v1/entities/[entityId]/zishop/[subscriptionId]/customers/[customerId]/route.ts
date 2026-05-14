// GET   /…/customers/:customerId
// PATCH /…/customers/:customerId
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateCustomerSchema } from '@/zishop/validators'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, customerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zsh_customers')
    .select('*').eq('id', customerId).single()
  if (error || !data) return notFound('Customer')
  if (data.entity_id !== entityId) return conflict('Access denied')

  // Strip mobile_hash from response
  const { mobile_hash, ...safe } = data
  return ok(safe)
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, customerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: customer } = await db.from('zsh_customers')
    .select('id,entity_id').eq('id', customerId).single()
  if (!customer) return notFound('Customer')
  if (customer.entity_id !== entityId) return conflict('Access denied')

  const parsed = UpdateCustomerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { mobile, ...rest } = parsed.data
  const updates: Record<string, any> = { ...rest, updated_at: new Date().toISOString() }
  if (mobile !== undefined) {
    updates.mobile_hash  = mobile ? createHash('sha256').update(mobile.trim()).digest('hex') : null
    updates.mobile_last4 = mobile ? mobile.slice(-4) : null
  }

  const { data, error } = await db.from('zsh_customers')
    .update(updates).eq('id', customerId).select().single()
  if (error || !data) return serverError('Failed to update customer', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zsh_customers', record_id: customerId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: rest, ...extractRequestMeta(req) })

  const { mobile_hash, ...safe } = data
  return ok(safe)
})
