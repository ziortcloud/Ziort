// GET  /api/v1/entities → list entities for authenticated individual
// POST /api/v1/entities → create new entity + auto-create primary branch + membership
import { db } from '@/ziorbitcore/db/client'
import { requireSession } from '@/ziorbitcore/auth/session'
import { nextEntityCode, nextBranchCode, branchRefCode, subscriptionRefCode, membershipRefCode } from '@/ziorbitcore/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { CreateEntitySchema } from '@/ziorbitcore/validators/entity'
import { ok, created, validationError, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import crypto from 'crypto'

export const GET = withErrorHandler(async (req: Request) => {
  const session = await requireSession()

  const { data: memberships } = await db
    .from('zi_memberships')
    .select(`
      role, is_primary_owner, is_billing_owner, ref_code, joined_at,
      zi_entities (
        id, zi_code, legal_name, trade_name, entity_type,
        city, state, country_code, is_active, created_at
      )
    `)
    .eq('individual_id', session.individual.id)
    .eq('is_active', true)
    .order('created_at', { foreignTable: 'zi_entities', ascending: false })

  return ok(
    (memberships ?? []).map((m: any) => ({
      ...m.zi_entities,
      my_role:          m.role,
      membership_ref:   m.ref_code,
      is_primary_owner: m.is_primary_owner,
      is_billing_owner: m.is_billing_owner,
      joined_at:        m.joined_at,
    }))
  )
})

export const POST = withErrorHandler(async (req: Request) => {
  const session = await requireSession()
  const body = await req.json()
  const parsed = CreateEntitySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { legal_name, trade_name, entity_type, country_code, business_id_type, business_id, city, state } = parsed.data

  // Generate codes
  const entity_zi_code  = await nextEntityCode()
  const branch_zi_code  = await nextBranchCode()
  const branch_ref      = branchRefCode(entity_zi_code, branch_zi_code)
  const membership_ref  = membershipRefCode(entity_zi_code, session.individual.zi_code)

  // Hash business ID if provided
  const business_id_hash  = business_id ? crypto.createHash('sha256').update(business_id).digest('hex') : null
  const business_id_last6 = business_id ? business_id.slice(-6) : null

  // Insert entity
  const { data: entity, error: entityError } = await db
    .from('zi_entities')
    .insert({
      zi_code:              entity_zi_code,
      legal_name,
      trade_name:           trade_name ?? null,
      entity_type,
      country_code,
      business_id_type:     business_id_type ?? null,
      business_id_hash,
      business_id_last6,
      business_id_verified: false,
      city:  city  ?? null,
      state: state ?? null,
    })
    .select()
    .single()

  if (entityError || !entity) return serverError('Failed to create entity', entityError)

  // Auto-create primary branch (Head Office)
  const { data: branch, error: branchError } = await db
    .from('zi_branches')
    .insert({
      zi_code:      branch_zi_code,
      entity_id:    entity.id,
      ref_code:     branch_ref,
      name:         'Head Office',
      city:         city  ?? null,
      state:        state ?? null,
      country_code,
      is_primary:   true,
    })
    .select()
    .single()

  if (branchError) return serverError('Failed to create primary branch', branchError)

  // Auto-create wallet
  await db.from('zi_wallet').insert({
    entity_id:     entity.id,
    balance_paise: 0,
    currency:      'INR',
  })

  // Create primary owner membership
  const { data: membership, error: memberError } = await db
    .from('zi_memberships')
    .insert({
      ref_code:         membership_ref,
      entity_id:        entity.id,
      individual_id:    session.individual.id,
      role:             'owner',
      is_primary_owner: true,
      is_billing_owner: true,
      joined_at:        new Date().toISOString(),
    })
    .select()
    .single()

  if (memberError) return serverError('Failed to create membership', memberError)

  // Audit
  const meta = extractRequestMeta(req)
  await writeAudit({
    action:        'CREATE',
    table_name:    'zi_entities',
    record_id:     entity.id,
    ref_code:      entity_zi_code,
    entity_id:     entity.id,
    individual_id: session.individual.id,
    new_value:     { zi_code: entity_zi_code, legal_name, entity_type },
    ...meta,
  })

  return created({
    entity: { ...entity, my_role: 'owner', membership_ref },
    branch,
    membership,
  })
})
