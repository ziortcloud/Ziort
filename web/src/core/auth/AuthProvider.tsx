import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { useSessionStore } from '../store/session'

interface AuthContext {
  user:    User | null
  session: Session | null
  ready:   boolean
}

const Ctx = createContext<AuthContext>({ user: null, session: null, ready: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready,   setReady]   = useState(false)
  const { loadSession, clearSession } = useSessionStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      setSession(supabaseSession)
      setUser(supabaseSession?.user ?? null)

      if (event === 'SIGNED_OUT') {
        clearSession()
        setReady(true)
        return
      }

      // Only reload Ziort session on actual sign-in or initial page load, not on every token refresh
      if (supabaseSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        await loadSession()
      }

      setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, session, ready }}>{children}</Ctx.Provider>
}

export const useAuth    = () => useContext(Ctx)
export const useAuthUser = () => useContext(Ctx).user
