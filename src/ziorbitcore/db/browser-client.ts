// Ziort Core — Supabase Browser Client (Anon Key)
// USE: Browser-side auth operations ONLY (login, logout, session).
// All data fetching MUST go through /api/v1/* — NEVER call
// supabase.from() or supabase.rpc() from the browser.
import { createBrowserClient } from '@supabase/ssr'

export function createZiortBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
