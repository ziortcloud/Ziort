// GET + POST /…/zipost/:subscriptionId/ads
import { createHash } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextAdCode } from '@/zipost/services/codes'

const AD_TYPES = ['SELL','BUY','RENT','SERVICE','JOB','MATRIMONY','OTHER'] as const

const CreateAdSchema = z.object({
  ad_type:         z.enum(AD_TYPES).optional(),
  category:        z.string().min(1).max(100),
  title:           z.string().min(5).max(200),
  description:     z.string().max(2000).optional(),
  price_paise:     z.number().int().positive().optional(),
  is_negotiable:   z.boolean().optional(),
  condition:       z.enum(['NEW','LIKE_NEW','GOOD','FAIR','FOR_PARTS']).optional(),
  images:          z.array(z.string().url()).max(10).optional(),
  location_city:   z.string().max(100).optional(),
  location_state:  z.string().max(100).optional(),
  location_pincode: z.string().max(10).optional(),
  contact_name:    z.string().min(1).max(200),
  contact_mobile:  z.string().regex(/^\d{10}$/).optional(),
  contact_email:   z.string().email().optional(),
  expires_in_days: z.number().int().min(1).max(90).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const own_only  = searchParams.get('mine') === 'true'
  const ad_type   = searchParams.get('type')
  const category  = searchParams.get('category')
  const city      = searchParams.get('city')
  const status    = searchParams.get('status') ?? 'ACTIVE'
  const search    = searchParams.get('q')

  let query = db.from('zps_ads')
    .select('id,zi_code,ad_type,category,title,price_paise,is_negotiable,condition,location_city,status,is_featured,view_count,contact_name,created_at',
      { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (own_only) query = query.eq('entity_id', entityId)
  if (status)   query = query.eq('status', status)
  if (ad_type)  query = query.eq('ad_type', ad_type)
  if (category) query = query.ilike('category', `%${category}%`)
  if (city)     query = query.ilike('location_city', `%${city}%`)
  if (search)   query = query.ilike('title', `%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load ads', error)
  return ok({ ads: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateAdSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { contact_mobile, expires_in_days, ...fields } = parsed.data
  const contact_mobile_hash  = contact_mobile ? createHash('sha256').update(contact_mobile.trim()).digest('hex') : null
  const contact_mobile_last4 = contact_mobile ? contact_mobile.slice(-4) : null
  const expires_at           = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : new Date(Date.now() + 30 * 86400000).toISOString()  // default 30 days

  const zi_code = await nextAdCode()

  const { data, error } = await db.from('zps_ads').insert({
    ...fields,
    zi_code,
    entity_id:             entityId,
    subscription_id:       subscriptionId,
    contact_mobile_hash,
    contact_mobile_last4,
    expires_at,
    created_by:            session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to post ad', error)

  await writeAudit({ action: 'CREATE', table_name: 'zps_ads', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, title: fields.title, ad_type: fields.ad_type },
    ...extractRequestMeta(req) })

  return created(data)
})
