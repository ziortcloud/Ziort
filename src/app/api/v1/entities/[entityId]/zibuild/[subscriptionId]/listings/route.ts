// GET + POST /…/zibuild/:subscriptionId/listings
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextListingCode } from '@/zibuild/services/codes'

const CATEGORIES = ['CEMENT','STEEL','BRICKS','SAND','AGGREGATE','TIMBER','TILES','PAINT',
  'PLUMBING','ELECTRICAL','GLASS','TOOLS','HEAVY_EQUIPMENT','SCAFFOLDING','OTHER'] as const
const UNITS = ['KG','TON','BAGS','PCS','SFT','CFT','METER','LITRE','UNIT','OTHER'] as const

const CreateListingSchema = z.object({
  listing_type:          z.enum(['SELL','BUY','RENT']).optional(),
  category:              z.enum(CATEGORIES),
  title:                 z.string().min(5).max(200),
  description:           z.string().max(2000).optional(),
  brand:                 z.string().max(100).optional(),
  grade:                 z.string().max(50).optional(),
  unit:                  z.enum(UNITS).optional(),
  qty_available:         z.number().positive().optional(),
  rate_paise:            z.number().int().positive(),
  min_order_qty:         z.number().positive().optional(),
  delivery_available:    z.boolean().optional(),
  delivery_charge_paise: z.number().int().min(0).optional(),
  location_city:         z.string().max(100).optional(),
  location_state:        z.string().max(100).optional(),
  images:                z.array(z.string().url()).max(10).optional(),
  contact_name:          z.string().max(200).optional(),
  contact_mobile:        z.string().regex(/^\d{10}$/).optional(),
  gstin:                 z.string().max(15).optional(),
  expires_in_days:       z.number().int().min(1).max(365).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const city     = searchParams.get('city')
  const type     = searchParams.get('type')
  const status   = searchParams.get('status') ?? 'ACTIVE'
  const own_only = searchParams.get('mine') === 'true'
  const search   = searchParams.get('q')

  let query = db.from('zbd_listings')
    .select('id,zi_code,listing_type,category,title,unit,qty_available,rate_paise,delivery_available,location_city,status,view_count,enquiry_count,contact_name,created_at',
      { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (own_only)  query = query.eq('entity_id', entityId)
  if (status)    query = query.eq('status', status)
  if (category)  query = query.eq('category', category)
  if (city)      query = query.ilike('location_city', `%${city}%`)
  if (type)      query = query.eq('listing_type', type)
  if (search)    query = query.ilike('title', `%${search}%`)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load listings', error)
  return ok({ listings: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateListingSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const { expires_in_days, ...fields } = parsed.data
  const expires_at = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null
  const zi_code = await nextListingCode()

  const { data, error } = await db.from('zbd_listings').insert({
    ...fields,
    zi_code,
    entity_id:       entityId,
    subscription_id: subscriptionId,
    expires_at,
    created_by:      session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create listing', error)

  await writeAudit({ action: 'CREATE', table_name: 'zbd_listings', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, title: fields.title, category: fields.category, rate_paise: fields.rate_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
