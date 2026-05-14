// GET  /api/v1/entities/:entityId/branches → list branches
// POST /api/v1/entities/:entityId/branches → create branch
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { nextBranchCode, branchRefCode } from '@/ziorbitcore/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { CreateBranchSchema } from '@/ziorbitcore/validators/entity'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const { data: branches } = await db
    .from('zi_branches')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  return ok(branches ?? [])
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const { role } = await requireEntityAccess(session, entityId)

  if (!['owner', 'co_owner'].includes(role)) {
    return new Response(
      JSON.stringify({ error: 'Only owners can add branches', code: 'FORBIDDEN' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()
  const parsed = CreateBranchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { name, address, city, state, country_code, is_primary } = parsed.data

  const { data: entity } = await db
    .from('zi_entities')
    .select('zi_code')
    .eq('id', entityId)
    .single()

  if (!entity) return new Response(JSON.stringify({ error: 'Entity not found' }), { status: 404 })

  const branch_zi_code = await nextBranchCode()
  const ref_code       = branchRefCode(entity.zi_code, branch_zi_code)

  // If marking as primary, unset existing primary
  if (is_primary) {
    await db
      .from('zi_branches')
      .update({ is_primary: false })
      .eq('entity_id', entityId)
      .eq('is_primary', true)
  }

  const { data: branch, error: branchError } = await db
    .from('zi_branches')
    .insert({
      zi_code:     branch_zi_code,
      entity_id:   entityId,
      ref_code,
      name,
      address:     address     ?? null,
      city:        city        ?? null,
      state:       state       ?? null,
      country_code,
      is_primary:  is_primary ?? false,
    })
    .select()
    .single()

  if (branchError || !branch) return serverError('Failed to create branch', branchError)

  const meta = extractRequestMeta(req)
  await writeAudit({
    action:        'CREATE',
    table_name:    'zi_branches',
    record_id:     branch.id,
    ref_code,
    entity_id:     entityId,
    individual_id: session.individual.id,
    new_value:     { ref_code, name, is_primary },
    ...meta,
  })

  return created(branch)
})
