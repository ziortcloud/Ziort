// GET  /api/v1/entities/:entityId/zifleet/:subscriptionId/drivers
// POST /api/v1/entities/:entityId/zifleet/:subscriptionId/drivers
import crypto from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, paginated, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { CreateDriverSchema } from '@/zifleet/validators'
import { nextDriverCode } from '@/zifleet/services/codes'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const search     = searchParams.get('search') ?? ''
  const activeOnly = searchParams.get('active') !== 'false'

  let query = db.from('zft_drivers')
    .select('id,zi_code,full_name,mobile_last4,license_no,license_expiry,status,total_trips,total_km_driven,is_active,created_at', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (activeOnly) query = query.eq('is_active', true)
  if (status)     query = query.eq('status', status)
  if (search)     query = query.or(`full_name.ilike.%${search}%,mobile_last4.eq.${search}`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load drivers', error)
  return paginated(data ?? [], { page, limit, total: count ?? 0 })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateDriverSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const mobile_hash  = sha256(parsed.data.mobile)
  const mobile_last4 = parsed.data.mobile.slice(-4)

  const { data: dup } = await db.from('zft_drivers')
    .select('id,zi_code').eq('subscription_id', subscriptionId).eq('mobile_hash', mobile_hash).maybeSingle()
  if (dup) return conflict(`Driver with this mobile already exists (${dup.zi_code})`)

  const zi_code = await nextDriverCode()
  const { mobile: _, ...rest } = parsed.data

  const { data: driver, error } = await db.from('zft_drivers').insert({
    ...rest,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    mobile_hash,
    mobile_last4,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !driver) return serverError('Failed to create driver', error)

  await writeAudit({ action: 'CREATE', table_name: 'zft_drivers', record_id: driver.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, full_name: parsed.data.full_name, mobile_last4 },
    ...extractRequestMeta(req) })

  return created(driver)
})
