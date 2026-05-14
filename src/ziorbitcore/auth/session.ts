// Ziort Core — Server-side Session Resolution
// Supports BOTH cookie auth (Next.js web) and Bearer token auth (Flutter / Android / iOS).
// Priority: Authorization header → cookies
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { db } from '../db/client'
import type { ZiIndividual } from '../types/core'

export interface AuthSession {
  auth_user_id: string
  email: string
  individual: ZiIndividual
}

// ─────────────────────────────────────────────
// Internal: resolve auth user from Bearer token
// ─────────────────────────────────────────────
async function getUserFromBearer(token: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null
  return user
}

// ─────────────────────────────────────────────
// Internal: resolve auth user from cookies (web)
// ─────────────────────────────────────────────
async function getUserFromCookies() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any))
        },
      },
    }
  )
  const { data: { user } } = await client.auth.getUser()
  return user ?? null
}

// ─────────────────────────────────────────────
// Public: getSession — call with optional Request for mobile support
// ─────────────────────────────────────────────
export async function getSession(req?: Request): Promise<AuthSession | null> {
  let authUserId: string | undefined
  let email: string | undefined

  // 1. Try Authorization: Bearer <token> (mobile / API clients)
  const authHeader = req?.headers.get('Authorization') ?? null
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const user = await getUserFromBearer(token)
    if (user) { authUserId = user.id; email = user.email ?? '' }
  }

  // 2. Fall back to cookies (web browser session)
  if (!authUserId) {
    const user = await getUserFromCookies()
    if (user) { authUserId = user.id; email = user.email ?? '' }
  }

  if (!authUserId) return null

  const { data: individual, error } = await db
    .from('zi_individuals')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .single()

  if (error || !individual) return null
  return { auth_user_id: authUserId, email: email ?? '', individual }
}

// ─────────────────────────────────────────────
// requireSession — throws 401 if not authenticated
// Always pass req so mobile Bearer tokens work
// ─────────────────────────────────────────────
export async function requireSession(req?: Request): Promise<AuthSession> {
  const session = await getSession(req)
  if (!session) throw new Response(
    JSON.stringify({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
  return session
}

// ─────────────────────────────────────────────
// requireEntityAccess — verifies membership
// ─────────────────────────────────────────────
export async function requireEntityAccess(
  session: AuthSession,
  entity_id: string
): Promise<{ role: string; membership_ref: string }> {
  const { data: m, error } = await db
    .from('zi_memberships')
    .select('role, ref_code')
    .eq('entity_id', entity_id)
    .eq('individual_id', session.individual.id)
    .eq('is_active', true)
    .single()

  if (error || !m) throw new Response(
    JSON.stringify({ success: false, error: 'Forbidden', code: 'ENTITY_ACCESS_DENIED' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
  return { role: m.role, membership_ref: m.ref_code }
}

// ─────────────────────────────────────────────
// requireSubscriptionAccess — verifies active subscription
// Returns subscription row so routes can use it
// ─────────────────────────────────────────────
export async function requireSubscriptionAccess(
  session: AuthSession,
  subscription_id: string
): Promise<{ entity_id: string; product_code: string; status: string; zi_code: string; ref_code: string }> {
  const { data: sub, error } = await db
    .from('zi_subscriptions')
    .select('entity_id, product_code, status, zi_code, ref_code')
    .eq('id', subscription_id)
    .single()

  if (error || !sub) throw new Response(
    JSON.stringify({ success: false, error: 'Subscription not found', code: 'SUB_NOT_FOUND' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  )
  await requireEntityAccess(session, sub.entity_id)
  if (sub.status === 'cancelled') throw new Response(
    JSON.stringify({ success: false, error: 'Subscription cancelled', code: 'SUB_CANCELLED' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
  return sub
}

// ─────────────────────────────────────────────
// requireCronSecret — protects cron endpoints
// ─────────────────────────────────────────────
export function requireCronSecret(req: Request): void {
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) throw new Response(
    JSON.stringify({ success: false, error: 'Forbidden', code: 'INVALID_CRON_SECRET' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}
