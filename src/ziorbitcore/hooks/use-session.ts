'use client'
import { useEffect } from 'react'
import { useSessionStore } from '../store/session'

export function useSession() {
  const { session, setSession, clearSession, setActiveSubscriptions } = useSessionStore()

  useEffect(() => {
    if (session) return
    fetch('/api/v1/auth/session')
      .then(res => (res.ok ? res.json() : null))
      .then(async json => {
        if (!json?.data) { clearSession(); return }
        const { individual, email, entities } = json.data
        const activeEntity = entities[0] ?? null
        setSession({
          individual,
          currentEmail: email,
          entities,
          activeEntity,
          activeBranch:        null,
          activeSubscriptions: [],
          membership:          null,
        })
        if (activeEntity) {
          const subRes = await fetch(`/api/v1/entities/${activeEntity.id}/subscriptions`)
          if (subRes.ok) {
            const subJson = await subRes.json()
            setActiveSubscriptions(subJson.data ?? [])
          }
        }
      })
      .catch(() => clearSession())
  }, [session, setSession, clearSession, setActiveSubscriptions])

  return { session }
}
