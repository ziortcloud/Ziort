// GET    /api/v1/entities/:entityId/zipawn/:subscriptionId/customers/:customerId
// PATCH  /api/v1/entities/:entityId/zipawn/:subscriptionId/customers/:customerId
// DELETE /api/v1/entities/:entityId/zipawn/:subscriptionId/customers/:customerId (soft)
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { UpdateCustomerSchema, BlacklistCustomerSchema } from '@/zipawn/validators'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, customerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: customer, error } = await db.from('zpn_customers')
    .select('*').eq('id', customerId).eq('entity_id', entityId).single()
  if (error || !customer) return notFound('Customer')

  // Recent loan summary
  const { data: loans } = await db.from('zpn_loans')
    .select('id,zi_code,status,sanctioned_paise,outstanding_paise,maturity_date,opened_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5)

  return ok({ ...customer, recent_loans: loans ?? [] })
})

export const PATCH = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, customerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  // Blacklist / unblacklist action
  if (action === 'blacklist') {
    const parsed = BlacklistCustomerSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const { data: customer, error } = await db.from('zpn_customers')
      .update({
        is_blacklisted:   parsed.data.blacklist,
        blacklist_reason: parsed.data.blacklist ? (parsed.data.reason ?? null) : null,
        blacklist_at:     parsed.data.blacklist ? new Date().toISOString() : null,
        blacklist_by:     parsed.data.blacklist ? session.individual.id : null,
        blacklist_expiry: parsed.data.blacklist ? (parsed.data.blacklist_expiry ?? null) : null,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', customerId).eq('entity_id', entityId).select().single()

    if (error || !customer) return serverError('Failed to update blacklist status', error)

    await writeAudit({ action: 'UPDATE', table_name: 'zpn_customers', record_id: customerId,
      entity_id: entityId, individual_id: session.individual.id,
      new_value: { is_blacklisted: parsed.data.blacklist, reason: parsed.data.reason },
      ...extractRequestMeta(req) })

    return ok(customer)
  }

  const parsed = UpdateCustomerSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const d = parsed.data
  const extra: Record<string, unknown> = {}

  // If id_number provided, hash it
  if ('id_number' in d && d.id_number) {
    extra.id_hash  = sha256(d.id_number)
    extra.id_last6 = d.id_number.slice(-6)
    delete (d as any).id_number
  }
  if (d.kyc_verified_at) {
    extra.kyc_verified_at = d.kyc_verified_at
    delete (d as any).kyc_verified_at
  }

  const { data: customer, error } = await db.from('zpn_customers')
    .update({ ...d, ...extra, updated_at: new Date().toISOString() })
    .eq('id', customerId).eq('entity_id', entityId).select().single()

  if (error || !customer) return serverError('Failed to update customer', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_customers', record_id: customerId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: d, ...extractRequestMeta(req) })

  return ok(customer)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, customerId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  // Block if customer has active loans
  const { count } = await db.from('zpn_loans')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .in('status', ['active','overdue','npa'])
  if ((count ?? 0) > 0) return conflict('Cannot deactivate customer with active loans')

  const { data: customer, error } = await db.from('zpn_customers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', customerId).eq('entity_id', entityId).select('id,zi_code').single()

  if (error || !customer) return serverError('Failed to deactivate customer', error)

  await writeAudit({ action: 'UPDATE', table_name: 'zpn_customers', record_id: customerId,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { is_active: false }, ...extractRequestMeta(req) })

  return ok({ deactivated: true, id: customer.id })
})
