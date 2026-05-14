'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ZiSession } from '../types/core'

interface SessionStore {
  session: ZiSession | null
  setSession:             (s: ZiSession)              => void
  clearSession:           ()                           => void
  setActiveEntity:        (id: string)                 => void
  setActiveSubscriptions: (subs: ZiSession['activeSubscriptions']) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      setSession:   (s)  => set({ session: s }),
      clearSession: ()   => set({ session: null }),
      setActiveEntity: (entityId) => {
        const { session } = get()
        if (!session) return
        const entity = session.entities.find(e => e.id === entityId) ?? null
        set({ session: { ...session, activeEntity: entity } })
      },
      setActiveSubscriptions: (subs) => {
        const { session } = get()
        if (!session) return
        set({ session: { ...session, activeSubscriptions: subs } })
      },
    }),
    { name: 'zi-session' }
  )
)
