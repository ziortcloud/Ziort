// POST /api/v1/auth/register
// Creates auth user + zi_individuals + zi_entities + zi_memberships in one shot.
// Returns session tokens so the client can auto-login without a round-trip.
import { randomUUID } from 'crypto'
import { db } from '@/ziorbitcore/db/client'
import { createClient } from '@supabase/supabase-js'
import {
  nextIndividualCode, nextEntityCode, nextBranchCode,
  membershipRefCode,
} from '@/ziorbitcore/services/codes'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { sendWelcomeEmail } from '@/ziorbitcore/services/email'
import { created, validationError, conflict, serverError, badRequest } from '@/ziorbitcore/api/response'
import { withErrorHandler } from '@/ziorbitcore/api/response'
import { z } from 'zod'

const FullRegisterSchema = z.object({
  display_name:   z.string().min(2).max(100),
  email:          z.string().email(),
  password:       z.string().min(8).max(72),
  country_code:   z.string().length(2).default('IN'),
  preferred_lang: z.string().default('en'),
  legal_name:     z.string().min(2).max(200),
  entity_type:    z.string().min(2).max(60),
})

const adminAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const anonAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json()
  const parsed = FullRegisterSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { display_name, email, password, country_code, preferred_lang, legal_name, entity_type } = parsed.data
  const emailLower = email.toLowerCase()

  // Reject if email already registered in application layer
  const { data: existingEmail } = await db
    .from('zi_individual_emails')
    .select('id')
    .eq('email', emailLower)
    .eq('is_current', true)
    .maybeSingle()

  if (existingEmail) return conflict('An account with this email already exists')

  // Create Supabase auth user (auto-confirmed so login works immediately)
  const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
    email: emailLower,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    // If auth user already exists but no zi_individual, let client know to use /setup
    if (authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already been registered')) {
      return conflict('An account with this email already exists. Please sign in.')
    }
    return badRequest(authError?.message ?? 'Failed to create auth user')
  }

  const authUserId = authData.user.id

  // All DB work after this point — rollback auth user on any failure
  try {
    const [indCode, entityCode, branchCode] = await Promise.all([
      nextIndividualCode(),
      nextEntityCode(),
      nextBranchCode(),
    ])

    const individualId = randomUUID()
    const entityId     = randomUUID()
    const branchId     = randomUUID()

    // Create individual
    const { data: individual, error: indErr } = await db
      .from('zi_individuals')
      .insert({ id: individualId, zi_code: indCode, display_name, country_code, preferred_lang, auth_user_id: authUserId, is_active: true })
      .select('id, zi_code')
      .single()

    if (indErr || !individual) throw new Error(`individual: ${indErr?.message}`)

    // Create email record
    await db.from('zi_individual_emails').insert({
      id:            randomUUID(),
      individual_id: individual.id,
      email:         emailLower,
      is_current:    true,
      is_verified:   true,
    })

    // Create entity
    const { data: entity, error: entityErr } = await db
      .from('zi_entities')
      .insert({ id: entityId, zi_code: entityCode, legal_name, entity_type, country_code, is_active: true })
      .select('id, zi_code')
      .single()

    if (entityErr || !entity) throw new Error(`entity: ${entityErr?.message}`)

    // Create primary branch
    await db.from('zi_branches').insert({
      id:          branchId,
      zi_code:     branchCode,
      ref_code:    `${entityCode}${branchCode}`,
      entity_id:   entity.id,
      name:        'Main Branch',
      country_code,
      is_primary:  true,
      is_active:   true,
    })

    // Create owner membership
    const memberRef = membershipRefCode(entityCode, indCode)
    await db.from('zi_memberships').insert({
      id:               randomUUID(),
      ref_code:         memberRef,
      entity_id:        entity.id,
      individual_id:    individual.id,
      role:             'owner',
      is_primary_owner: true,
      is_billing_owner: true,
      is_active:        true,
    })

    // Sign in to get session tokens for auto-login
    const { data: session, error: sessionErr } = await anonAuth.auth.signInWithPassword({
      email: emailLower,
      password,
    })

    // Audit (non-blocking)
    const meta = extractRequestMeta(req)
    writeAudit({
      action: 'CREATE',
      table_name: 'zi_individuals',
      record_id: individual.id,
      ref_code: indCode,
      individual_id: individual.id,
      new_value: { zi_code: indCode, display_name, country_code, entity_code: entityCode },
      ...meta,
    })

    // Welcome email (non-blocking)
    sendWelcomeEmail({ to: emailLower, displayName: display_name, ziCode: indCode })

    return created({
      zi_code:       indCode,
      display_name,
      email:         emailLower,
      entity_code:   entityCode,
      entity_id:     entity.id,
      individual_id: individual.id,
      // Return session if sign-in succeeded so client can auto-login
      ...(session?.session && !sessionErr ? {
        access_token:  session.session.access_token,
        refresh_token: session.session.refresh_token,
        expires_at:    session.session.expires_at,
      } : {}),
    })
  } catch (err) {
    // Rollback auth user so the email can be used again
    await adminAuth.auth.admin.deleteUser(authUserId).catch(() => null)
    return serverError('Registration failed. Please try again.', err)
  }
})
