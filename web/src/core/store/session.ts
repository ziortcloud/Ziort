import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ZiSession, ZiEntity, ZiSubscription, ProductCode } from '../types/core'
import { apiGet } from '../api/client'

interface SessionStore {
  session: ZiSession | null
  loading: boolean
  setSession: (s: ZiSession | null) => void
  setActiveEntity: (entity: ZiEntity) => void
  setLastProduct: (code: ProductCode) => void
  loadSession: () => Promise<void>
  clearSession: () => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      loading: false,

      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),

      setActiveEntity: (entity) => set(s => ({
        session: s.session ? { ...s.session, activeEntity: entity } : null,
      })),

      setLastProduct: (code) => set(s => ({
        session: s.session ? { ...s.session, lastProductCode: code } : null,
      })),

      loadSession: async () => {
        set({ loading: true })
        try {
          const data = await apiGet<ZiSession>('/auth/session')
          set({ session: data })
        } catch (err: any) {
          // Only wipe session on auth failure — not on network errors (ECONNREFUSED, timeout).
          // Network errors leave the persisted session intact so offline/dev still works.
          const status = err?.response?.status
          if (status === 401 || status === 403) {
            set({ session: null })
          }
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: 'zi-session',
      // Only persist the session data, not loading state or functions
      partialize: (s) => ({ session: s.session }),
    }
  )
)

// ─── Convenience selectors ────────────────────────────────────────────────────
export const useSession          = () => useSessionStore(s => s.session)
export const useActiveEntity     = () => useSessionStore(s => s.session?.activeEntity ?? null)
export const useActiveSubscriptions = () => useSessionStore(s => s.session?.activeSubscriptions ?? [])
export const useSubscription     = (code: ProductCode): ZiSubscription | undefined =>
  useSessionStore(s => s.session?.activeSubscriptions.find(sub => sub.product_code === code))
