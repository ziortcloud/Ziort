// GET + POST /…/ziyield/:subscriptionId/sales  — produce sales across all farms
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, conflict, validationError, serverError, withErrorHandler, parsePagination } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextSaleCode } from '@/ziyield/services/codes'

const CreateSaleSchema = z.object({
  farm_id:             z.string().uuid(),
  crop_id:             z.string().uuid().optional(),
  sale_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  buyer_name:          z.string().min(1).max(200),
  buyer_type:          z.enum(['MANDI','WHOLESALE','RETAIL','DIRECT','EXPORT','OTHER']).optional(),
  qty_kg:              z.number().positive(),
  rate_per_kg_paise:   z.number().int().positive(),
  transportation_paise: z.number().int().min(0).optional(),
  payment_mode:        z.enum(['CASH','UPI','BANK','OTHER']).optional(),
  reference_number:    z.string().max(100).optional(),
  notes:               z.string().max(500).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { page, limit, offset } = parsePagination(req.url)
  const { searchParams } = new URL(req.url)
  const farm_id  = searchParams.get('farm_id')
  const crop_id  = searchParams.get('crop_id')

  let query = db.from('zyl_produce_sales')
    .select('*, zyl_farms ( name ), zyl_crops ( crop_name )', { count: 'exact' })
    .eq('entity_id', entityId)
    .order('sale_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (farm_id) query = query.eq('farm_id', farm_id)
  if (crop_id) query = query.eq('crop_id', crop_id)

  const { data, count, error } = await query
  if (error) return serverError('Failed to load sales', error)
  return ok({ sales: data ?? [], total: count ?? 0, page, limit })
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateSaleSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  // Verify farm belongs to entity
  const { data: farm } = await db.from('zyl_farms').select('id,entity_id').eq('id', parsed.data.farm_id).single()
  if (!farm || farm.entity_id !== entityId) return conflict('Farm not found or access denied')

  const total_amount_paise = Math.round(parsed.data.qty_kg * parsed.data.rate_per_kg_paise)
  const transport          = parsed.data.transportation_paise ?? 0
  const net_amount_paise   = total_amount_paise - transport
  const zi_code            = await nextSaleCode()

  const { data, error } = await db.from('zyl_produce_sales').insert({
    ...parsed.data,
    zi_code,
    entity_id:            entityId,
    sale_date:            parsed.data.sale_date ?? new Date().toISOString().split('T')[0],
    transportation_paise: transport,
    total_amount_paise,
    net_amount_paise,
    payment_mode:         parsed.data.payment_mode ?? 'CASH',
    created_by:           session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to record sale', error)

  // Mark crop SOLD if crop_id provided
  if (parsed.data.crop_id) {
    await db.from('zyl_crops').update({ status: 'SOLD', updated_at: new Date().toISOString() })
      .eq('id', parsed.data.crop_id)
  }

  await writeAudit({ action: 'CREATE', table_name: 'zyl_produce_sales', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, buyer_name: parsed.data.buyer_name, net_amount_paise },
    ...extractRequestMeta(req) })

  return created(data)
})
