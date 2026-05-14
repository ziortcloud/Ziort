// POST /api/v1/auth/confirm
// Admin-only: force-confirms an unverified user's email so they can log in.
// Used to unblock users who registered before email_confirm was set to true.
// Protected by CRON_SECRET (same as cron jobs) — never expose to end users.
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler, ok, unauthorized, badRequest } from '@/ziorbitcore/api/response'

const adminAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const POST = withErrorHandler(async (req: Request) => {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) return unauthorized('Forbidden')

  const { email } = await req.json()
  if (!email) return badRequest('email required')

  // Look up the auth user by email
  const { data: list } = await adminAuth.auth.admin.listUsers()
  const user = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return badRequest('User not found in auth')

  // Force confirm the email
  const { error } = await adminAuth.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (error) return badRequest(`Failed to confirm: ${error.message}`)

  return ok({ confirmed: true, user_id: user.id, email: user.email })
})
