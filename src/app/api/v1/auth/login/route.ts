// POST /api/v1/auth/login
// Authenticates via Supabase Auth, returns session + individual profile.
import { createClient } from '@supabase/supabase-js'
import { db } from '@/ziorbitcore/db/client'
import { LoginSchema } from '@/ziorbitcore/validators/auth'
import { writeAudit, extractRequestMeta } from '@/ziorbitcore/services/audit'
import { ok, validationError, unauthorized, serverError, withErrorHandler } from '@/ziorbitcore/api/response'

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json()
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { email, password } = parsed.data

  // Sign in via Supabase Auth (server-side, service key)
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  })

  if (authError || !authData.session) {
    const msg = authError?.message ?? ''
    if (msg.includes('Email not confirmed'))
      return unauthorized('Email not confirmed. Please check your inbox or contact support.')
    if (msg.includes('Invalid login credentials'))
      return unauthorized('Incorrect email or password.')
    return unauthorized(msg || 'Login failed. Please try again.')
  }

  // Load individual record
  const { data: individual, error: indError } = await db
    .from('zi_individuals')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .eq('is_active', true)
    .single()

  if (indError || !individual) {
    return unauthorized('Account not found or deactivated')
  }

  // Update last_seen_at
  await db
    .from('zi_individuals')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', individual.id)

  // Load memberships (entities this individual belongs to)
  const { data: memberships } = await db
    .from('zi_memberships')
    .select(`
      role, is_primary_owner, is_billing_owner, ref_code,
      zi_entities ( id, zi_code, legal_name, trade_name, entity_type, is_active )
    `)
    .eq('individual_id', individual.id)
    .eq('is_active', true)

  // Audit login
  const meta = extractRequestMeta(req)
  await writeAudit({
    action: 'LOGIN',
    table_name: 'zi_individuals',
    record_id: individual.id,
    ref_code: individual.zi_code,
    individual_id: individual.id,
    ...meta,
  })

  return ok({
    access_token:  authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    expires_at:    authData.session.expires_at,
    individual: {
      id:           individual.id,
      zi_code:      individual.zi_code,
      display_name: individual.display_name,
      avatar_url:   individual.avatar_url,
      preferred_lang: individual.preferred_lang,
    },
    entities: (memberships ?? []).map((m: any) => ({
      ...m.zi_entities,
      my_role: m.role,
      membership_ref: m.ref_code,
      is_primary_owner: m.is_primary_owner,
      is_billing_owner: m.is_billing_owner,
    })),
  })
})
