'use client'
import { useQuery } from '@tanstack/react-query'
import type { ZpnLoan } from '../types'

export function useLoans(entityId: string, subscriptionId: string) {
  return useQuery<ZpnLoan[]>({
    queryKey: ['zpn-loans', entityId, subscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans`
      )
      if (!res.ok) throw new Error('Failed to load loans')
      const json = await res.json()
      return json.data
    },
    enabled: !!entityId && !!subscriptionId,
  })
}

export function useLoan(entityId: string, subscriptionId: string, loanId: string) {
  return useQuery<ZpnLoan>({
    queryKey: ['zpn-loan', loanId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}`
      )
      if (!res.ok) throw new Error('Failed to load loan')
      const json = await res.json()
      return json.data
    },
    enabled: !!loanId,
  })
}
