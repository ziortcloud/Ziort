// GET  /api/v1/entities/:entityId/members → list members
// POST /api/v1/entities/:entityId/members → invite member by email
import { db } from '@/ziorbitcore/db/client'
import { requireSession, requireEntityAccess } from '@/ziorbitcore/auth/session'
import { membershipRefCode } from '@/ziorbitcore/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { InviteMemberSchema } from '@/ziorbitcore/validators/entity'
import { ok, created, validationError, conflict, notFound, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const GET = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  await requireEntityAccess(session, entityId)

  const { data: members } = await db
    .from('zi_memberships')
    .select(`
      id, ref_code, role, is_primary_owner, is_billing_owner,
      equity_percent, branch_access, is_active, joined_at, expires_at, created_at,
      zi_individuals (
        id, zi_code, display_name, avatar_url
      )
    `)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  return ok(
    (members ?? []).map((m: any) => ({
      id:               m.id,
      ref_code:         m.ref_code,
      role:             m.role,
      is_primary_owner: m.is_primary_owner,
      is_billing_owner: m.is_billing_owner,
      equity_percent:   m.equity_percent,
      branch_access:    m.branch_access,
      is_active:        m.is_active,
      joined_at:        m.joined_at,
      expires_at:       m.expires_at,
      individual:       m.zi_individuals,
    }))
  )
})

export const POST = withErrorHandler(async (req: Request, ctx: any) => {
  const session = await requireSession()
  const { entityId } = ctx.params
  const { role: inviterRole } = await requireEntityAccess(session, entityId)

  if (!['owner', 'co_owner'].includes(inviterRole)) {
    return new Response(
      JSON.stringify({ error: 'Only owners can invite members', code: 'FORBIDDEN' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()
  const parsed = InviteMemberSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { email, role, branch_access, equity_percent, permissions, expires_at } = parsed.data

  // Find the individual by email
  const { data: emailRow } = await db
    .from('zi_individual_emails')
    .select('individual_id')
    .eq('email', email.toLowerCase())
    .eq('is_current', true)
    .single()

  if (!emailRow) return notFound('Individual with this email')

  const individual_id = emailRow.individual_id

  // Check not already a member
  const { data: existing } = await db
    .from('zi_memberships')
    .select('id, is_active')
    .eq('entity_id', entityId)
    .eq('individual_id', individual_id)
    .maybeSingle()

  if (existing?.is_active) return conflict('This person is already a member of this entity')

  // Load invited individual's zi_code for ref_code construction
  const { data: individual } = await db
    .from('zi_individuals')
    .select('zi_code')
    .eq('id', individual_id)
    .single()

  if (!individual) return notFound('Individual')

  const { data: entity } = await db
    .from('zi_entities')
    .select('zi_code')
    .eq('id', entityId)
    .single()

  if (!entity) return notFound('Entity')

  const ref_code = membershipRefCode(entity.zi_code, individual.zi_code)

  const { data: membership, error: memberError } = await db
    .from('zi_memberships')
    .upsert({
      ref_code,
      entity_id:     entityId,
      individual_id,
      role,
      is_primary_owner: false,
      is_billing_owner: false,
      equity_percent:   equity_percent ?? null,
      permissions:      permissions    ?? null,
      branch_access:    branch_access  ?? null,
      invited_by:       session.individual.id,
      is_active:        true,
      expires_at:       expires_at ?? null,
    }, { onConflict: 'entity_id,individual_id' })
    .select()
    .single()

  if (memberError || !membership) return serverError('Failed to create membership', memberError)

  const meta = extractRequestMeta(req)
  await writeAudit({
    action:        'CREATE',
    table_name:    'zi_memberships',
    record_id:     membership.id,
    ref_code,
    entity_id:     entityId,
    individual_id: session.individual.id,
    new_value:     { ref_code, role, invited_email: email },
    ...meta,
  })

  return created({ membership, message: `${email} has been added as ${role}` })
})
