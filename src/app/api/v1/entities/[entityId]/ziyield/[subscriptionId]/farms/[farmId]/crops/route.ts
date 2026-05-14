// GET + POST /…/farms/:farmId/crops
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, notFound, conflict, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextCropCode } from '@/ziyield/services/codes'

const CreateCropSchema = z.object({
  crop_name:             z.string().min(1).max(100),
  variety:               z.string().max(100).optional(),
  season:                z.enum(['KHARIF','RABI','ZAID','PERENNIAL']).optional(),
  sowing_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expected_harvest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  area_acres:            z.number().positive().optional(),
  expected_yield_kg:     z.number().positive().optional(),
  notes:                 z.string().max(500).optional(),
})

const UpdateCropSchema = CreateCropSchema.partial().extend({
  actual_harvest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  actual_yield_kg:     z.number().positive().optional(),
  status:              z.enum(['GROWING','HARVESTED','FAILED','SOLD']).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, farmId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: farm } = await db.from('zyl_farms').select('id,entity_id').eq('id', farmId).single()
  if (!farm) return notFound('Farm')
  if (farm.entity_id !== entityId) return conflict('Access denied')

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db.from('zyl_crops').select('*').eq('farm_id', farmId).order('sowing_date', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return serverError('Failed to load crops', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId, farmId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data: farm } = await db.from('zyl_farms').select('id,entity_id').eq('id', farmId).single()
  if (!farm) return notFound('Farm')
  if (farm.entity_id !== entityId) return conflict('Access denied')

  const parsed = CreateCropSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextCropCode()
  const { data, error } = await db.from('zyl_crops').insert({
    ...parsed.data, zi_code, entity_id: entityId, farm_id: farmId, created_by: session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to add crop', error)

  await writeAudit({ action: 'CREATE', table_name: 'zyl_crops', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, crop_name: parsed.data.crop_name }, ...extractRequestMeta(req) })

  return created(data)
})
