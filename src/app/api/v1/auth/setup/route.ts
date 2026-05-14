// POST /api/v1/auth/setup
// Called after email verification for users who signed up via Supabase direct.
// Creates zi_individuals + zi_entities + zi_memberships in one transaction.
// Does NOT require an existing individual record — uses Bearer token directly.
import { createClient } from '@supabase/supabase-js'
import { db } from '@/ziorbitcore/db/client'
import { nextIndividualCode, nextEntityCode, nextBranchCode, nextSubscriptionCode,
         membershipRefCode, subscriptionRefCode } from '@/ziorbitcore/services/codes'
import { ok, badRequest, conflict, serverError, withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const SetupSchema = z.object({
  display_name: z.string().min(2).max(120),
  legal_name:   z.string().min(2).max(200),
  entity_type:  z.string().min(2).max(60),
  country_code: z.string().default('IN'),
  preferred_lang: z.string().default('en'),
})

export const POST = withErrorHandler(async (req: Request) => {
  // ── 1. Resolve Supabase user from Bearer token ─────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return badRequest('Authorization header required')
  }
  const token = authHeader.slice(7)

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: userError } = await anonClient.auth.getUser()
  if (userError || !user) return badRequest('Invalid or expired token')

  // ── 2. Check if individual already exists ──────────────────────────────────
  const { data: existing } = await db
    .from('zi_individuals')
    .select('id, zi_code')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  // ── 3. Validate body ───────────────────────────────────────────────────────
  const body = await req.json()
  const parsed = SetupSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { display_name, legal_name, entity_type, country_code, preferred_lang } = parsed.data

  let individualId: string
  let individualZiCode: string

  // ── 4. Create individual if missing ────────────────────────────────────────
  if (!existing) {
    const zi_code = await nextIndividualCode()
    const { data: ind, error: indErr } = await db
      .from('zi_individuals')
      .insert({ zi_code, display_name, country_code, preferred_lang, auth_user_id: user.id, is_active: true })
      .select('id, zi_code')
      .single()

    if (indErr || !ind) return serverError('Failed to create individual', indErr)

    // Insert email record
    await db.from('zi_individual_emails').insert({
      individual_id: ind.id,
      email:         user.email?.toLowerCase() ?? '',
      is_current:    true,
      is_verified:   true,   // already verified via Supabase email flow
    })

    individualId     = ind.id
    individualZiCode = ind.zi_code
  } else {
    individualId     = existing.id
    individualZiCode = existing.zi_code

    // Update display_name if changed
    await db.from('zi_individuals').update({ display_name, preferred_lang }).eq('id', individualId)
  }

  // ── 5. Check if entity already exists for this individual ──────────────────
  const { data: existingMembership } = await db
    .from('zi_memberships')
    .select('id, entity_id')
    .eq('individual_id', individualId)
    .eq('is_active', true)
    .eq('is_primary_owner', true)
    .maybeSingle()

  if (existingMembership) {
    return ok({ message: 'Setup already complete', individual_id: individualId })
  }

  // ── 6. Create entity ───────────────────────────────────────────────────────
  const entityZiCode = await nextEntityCode()
  const { data: entity, error: entityErr } = await db
    .from('zi_entities')
    .insert({ zi_code: entityZiCode, legal_name, entity_type, country_code, is_active: true })
    .select('id, zi_code')
    .single()

  if (entityErr || !entity) return serverError('Failed to create entity', entityErr)

  // ── 7. Create primary branch ───────────────────────────────────────────────
  const branchZiCode = await nextBranchCode()
  await db.from('zi_branches').insert({
    zi_code:   branchZiCode,
    ref_code:  `${entityZiCode}${branchZiCode}`,
    entity_id: entity.id,
    name:      'Main Branch',
    country_code,
    is_primary: true,
    is_active:  true,
  })

  // ── 8. Create membership (owner) ───────────────────────────────────────────
  const memberRef = membershipRefCode(entityZiCode, individualZiCode)
  await db.from('zi_memberships').insert({
    ref_code:          memberRef,
    entity_id:         entity.id,
    individual_id:     individualId,
    role:              'owner',
    is_primary_owner:  true,
    is_billing_owner:  true,
    is_active:         true,
  })

  return ok({
    message:       'Setup complete',
    individual_id: individualId,
    entity_id:     entity.id,
    entity_code:   entityZiCode,
  })
})
