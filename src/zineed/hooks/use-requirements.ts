'use client'
import { useQuery } from '@tanstack/react-query'
import type { ZndRequirement } from '../types'

export function useRequirements(entityId: string, subscriptionId: string) {
  return useQuery<ZndRequirement[]>({
    queryKey: ['znd-requirements', entityId, subscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zineed/${subscriptionId}/requirements`
      )
      if (!res.ok) throw new Error('Failed to load requirements')
      const json = await res.json()
      return json.data
    },
    enabled: !!entityId && !!subscriptionId,
  })
}

export function useRequirement(entityId: string, subscriptionId: string, reqId: string) {
  return useQuery<ZndRequirement>({
    queryKey: ['znd-requirement', reqId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zineed/${subscriptionId}/requirements/${reqId}`
      )
      if (!res.ok) throw new Error('Failed to load requirement')
      const json = await res.json()
      return json.data
    },
    enabled: !!reqId,
  })
}
