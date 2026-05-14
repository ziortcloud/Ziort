import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiGetPaged, apiPost, apiPatch } from '../../../core/api/client'

const base = (entityId: string, subId: string) => `/entities/${entityId}/zidriver/${subId}`

// ─── Profile ──────────────────────────────────────────────────────────────────
export function useDriverProfile(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zidriver', 'profile', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/profile`),
  })
}

export function useCreateDriverProfile(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/profile`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'profile'] }),
  })
}

export function useUpdateDriverProfile(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPatch<any>(`${base(entityId, subId)}/profile`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'profile'] }),
  })
}

// ─── Availability ─────────────────────────────────────────────────────────────
export function useAvailability(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zidriver', 'availability', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/availability`),
  })
}

export function usePostAvailability(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/availability`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'availability'] }),
  })
}

export function useWithdrawAvailability(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId }: { slotId: string }) =>
      apiPatch<any>(`${base(entityId, subId)}/availability/${slotId}`, { status: 'WITHDRAWN' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'availability'] }),
  })
}

// ─── Documents ────────────────────────────────────────────────────────────────
export function useDocuments(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zidriver', 'documents', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/documents`),
  })
}

export function useAddDocument(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/documents`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'documents'] }),
  })
}

export function useUpdateDocument(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/documents/${docId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'documents'] }),
  })
}

// ─── Engagements ──────────────────────────────────────────────────────────────
export function useEngagements(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zidriver', 'engagements', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/engagements`, params),
  })
}

export function useEngagement(entityId: string, subId: string, engId: string) {
  return useQuery({
    queryKey: ['zidriver', 'engagement', engId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/engagements/${engId}`),
    enabled:  !!engId,
  })
}

export function useRespondToEngagement(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ engId, action, body }: { engId: string; action: string; body?: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/engagements/${engId}?action=${action}`, body ?? {}),
    onSuccess: (_d, { engId }) => {
      qc.invalidateQueries({ queryKey: ['zidriver', 'engagement', engId] })
      qc.invalidateQueries({ queryKey: ['zidriver', 'engagements'] })
    },
  })
}

export function useRateEngagement(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ engId, body }: { engId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/engagements/${engId}/rate`, body),
    onSuccess: (_d, { engId }) => qc.invalidateQueries({ queryKey: ['zidriver', 'engagement', engId] }),
  })
}

// ─── Discover ─────────────────────────────────────────────────────────────────
export function useDiscoverDrivers(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zidriver', 'discover', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/discover`, params),
    enabled:  !!params,
  })
}

export function useHireDriver(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/hire`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zidriver', 'engagements'] }),
  })
}

// ─── Ratings ──────────────────────────────────────────────────────────────────
export function useMyRatings(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zidriver', 'ratings', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/ratings`),
  })
}
