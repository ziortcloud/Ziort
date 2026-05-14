// GET + POST /…/ziyield/:subscriptionId/farms
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireSubscriptionAccess } from '@/ziorbitcore/auth/session'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'
import { nextFarmCode } from '@/ziyield/services/codes'

const CreateFarmSchema = z.object({
  name:         z.string().min(1).max(200),
  location:     z.string().max(300).optional(),
  area_acres:   z.number().positive().optional(),
  soil_type:    z.string().max(100).optional(),
  water_source: z.enum(['RAIN','BOREWELL','CANAL','DRIP','OTHER']).optional(),
  notes:        z.string().max(500).optional(),
})

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const { data, error } = await db.from('zyl_farms')
    .select(`*, zyl_crops ( id, crop_name, status, sowing_date, expected_harvest_date )`)
    .eq('entity_id', entityId).eq('is_active', true).order('name')
  if (error) return serverError('Failed to load farms', error)
  return ok(data ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession(req)
  const { entityId, subscriptionId } = await ctx.params
  await requireSubscriptionAccess(session, subscriptionId)

  const parsed = CreateFarmSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)

  const zi_code = await nextFarmCode()
  const { data, error } = await db.from('zyl_farms').insert({
    ...parsed.data, zi_code, entity_id: entityId, subscription_id: subscriptionId,
    created_by: session.individual.id,
  }).select().single()

  if (error || !data) return serverError('Failed to create farm', error)

  await writeAudit({ action: 'CREATE', table_name: 'zyl_farms', record_id: data.id,
    entity_id: entityId, individual_id: session.individual.id,
    new_value: { zi_code, name: parsed.data.name }, ...extractRequestMeta(req) })

  return created(data)
})
