// GET  /api/v1/entities/:entityId/app-config        → list entity configs
// POST /api/v1/entities/:entityId/app-config        → set / upsert a config
// DELETE /api/v1/entities/:entityId/app-config?key= → delete a config

import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { getConfigs, setConfig, deleteConfig } from '@/ziorbitcore/services/app-config'
import { ok, created, badRequest, validationError, forbidden, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const SetConfigSchema = z.object({
  key:        z.string().min(1).max(128).regex(/^[a-z0-9._-]+$/),
  value:      z.unknown(),
  scopeType:  z.enum(['ENTITY', 'BRANCH', 'SUBSCRIPTION']).default('ENTITY'),
  scopeId:    z.string().uuid().optional(),
  isPublic:   z.boolean().default(false),
})

export const GET = withErrorHandler(async (_req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const configs = await getConfigs('ENTITY', entityId)
  return ok(configs)
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const membership = await requireEntityAccess(session, entityId)

  if (!['owner', 'co_owner', 'manager'].includes(membership.role)) {
    return forbidden('Only owners and managers can update app configs')
  }

  const body = await req.json()
  const parsed = SetConfigSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { key, value, scopeType, scopeId, isPublic } = parsed.data
  const config = await setConfig(key, value, scopeType, scopeId ?? entityId, entityId, isPublic)
  return created(config)
})

export const DELETE = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const membership = await requireEntityAccess(session, entityId)

  if (!['owner', 'co_owner'].includes(membership.role)) {
    return forbidden('Only owners can delete app configs')
  }

  const url = new URL(req.url)
  const key = url.searchParams.get('key')
  if (!key) return badRequest('key query parameter is required')

  await deleteConfig(key, 'ENTITY', entityId)
  return ok({ deleted: true })
})
