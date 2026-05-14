'use client'
import { useQuery } from '@tanstack/react-query'
import type { ZplsAppointment } from '../types'

export function useAppointments(entityId: string, subscriptionId: string, date?: string) {
  return useQuery<ZplsAppointment[]>({
    queryKey: ['zpls-appointments', entityId, subscriptionId, date],
    queryFn: async () => {
      const params = date ? `?date=${date}` : ''
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipulse/${subscriptionId}/appointments${params}`
      )
      if (!res.ok) throw new Error('Failed to load appointments')
      const json = await res.json()
      return json.data
    },
    enabled: !!entityId && !!subscriptionId,
  })
}
