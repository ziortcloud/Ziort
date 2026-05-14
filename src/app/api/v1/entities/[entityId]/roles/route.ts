// GET  /api/v1/entities/:entityId/roles → list all roles (system + custom)
// POST /api/v1/entities/:entityId/roles → create a custom role

import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { listRoles, createRole } from '@/ziorbitcore/services/rbac'
import { ok, created, validationError, forbidden, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const CreateRoleSchema = z.object({
  name:        z.string().min(2).max(64),
  description: z.string().max(256).optional(),
  permissions: z.array(z.string()).default([]),
})

export const GET = withErrorHandler(async (_req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const roles = await listRoles(entityId)
  return ok(roles)
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const membership = await requireEntityAccess(session, entityId)

  if (!['owner', 'co_owner'].includes(membership.role)) {
    return forbidden('Only owners can create custom roles')
  }

  const body = await req.json()
  const parsed = CreateRoleSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { name, description, permissions } = parsed.data
  const role = await createRole(entityId, name, description ?? '', permissions)
  return created(role)
})
