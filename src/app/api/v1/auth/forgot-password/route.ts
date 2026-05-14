// POST /api/v1/auth/forgot-password
// Sends a Supabase password-reset email. Rate-limiting is handled by Supabase.
import { createClient } from '@supabase/supabase-js'
import { ok, badRequest, withErrorHandler } from '@/ziorbitcore/api/response'

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const POST = withErrorHandler(async (req: Request) => {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') return badRequest('email required')

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/reset-password`

  const { error } = await anonClient.auth.resetPasswordForEmail(email.toLowerCase(), { redirectTo })

  // Always return ok so we don't leak whether an email is registered
  if (error) console.error('[forgot-password] Supabase error:', error.message)

  return ok({ sent: true })
})
