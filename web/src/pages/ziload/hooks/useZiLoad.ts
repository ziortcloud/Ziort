import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiGetPaged, apiPost, apiPatch } from '../../../core/api/client'

const base = (entityId: string, subId: string) => `/entities/${entityId}/ziload/${subId}`

// ─── Profile ──────────────────────────────────────────────────────────────────
export function useZiLoadProfile(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['ziload', 'profile', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/profile`),
  })
}

export function useUpdateZiLoadProfile(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPatch<any>(`${base(entityId, subId)}/profile`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ziload', 'profile'] }),
  })
}

// ─── Loads ────────────────────────────────────────────────────────────────────
export function useLoads(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['ziload', 'loads', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/loads`, params),
  })
}

export function useLoad(entityId: string, subId: string, loadId: string) {
  return useQuery({
    queryKey: ['ziload', 'load', loadId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/loads/${loadId}`),
    enabled:  !!loadId,
  })
}

export function usePostLoad(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/loads`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ziload', 'loads'] }),
  })
}

export function useUpdateLoad(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loadId, body }: { loadId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/loads/${loadId}`, body),
    onSuccess: (_d, { loadId }) => {
      qc.invalidateQueries({ queryKey: ['ziload', 'loads'] })
      qc.invalidateQueries({ queryKey: ['ziload', 'load', loadId] })
    },
  })
}

// ─── Bids ─────────────────────────────────────────────────────────────────────
export function useLoadBids(entityId: string, subId: string, loadId: string) {
  return useQuery({
    queryKey: ['ziload', 'bids', loadId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/loads/${loadId}/bids`),
    enabled:  !!loadId,
  })
}

export function usePlaceBid(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loadId, body }: { loadId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/loads/${loadId}/bids`, body),
    onSuccess: (_d, { loadId }) => qc.invalidateQueries({ queryKey: ['ziload', 'bids', loadId] }),
  })
}

export function useRespondToBid(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loadId, bidId, body }: { loadId: string; bidId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/loads/${loadId}/bids/${bidId}`, body),
    onSuccess: (_d, { loadId }) => {
      qc.invalidateQueries({ queryKey: ['ziload', 'bids', loadId] })
      qc.invalidateQueries({ queryKey: ['ziload', 'bookings'] })
    },
  })
}

// ─── Trucks ───────────────────────────────────────────────────────────────────
export function useTrucks(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['ziload', 'trucks', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/trucks`, params),
  })
}

export function usePostTruck(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/trucks`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ziload', 'trucks'] }),
  })
}

export function useUpdateTruck(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ truckId, body }: { truckId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/trucks/${truckId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ziload', 'trucks'] }),
  })
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export function useBookings(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['ziload', 'bookings', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/bookings`, params),
  })
}

export function useBooking(entityId: string, subId: string, bookingId: string) {
  return useQuery({
    queryKey: ['ziload', 'booking', bookingId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/bookings/${bookingId}`),
    enabled:  !!bookingId,
  })
}

export function useAdvanceBookingStatus(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/bookings/${bookingId}/status`, body),
    onSuccess: (_d, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ['ziload', 'booking', bookingId] })
      qc.invalidateQueries({ queryKey: ['ziload', 'bookings'] })
    },
  })
}

export function useBookingMessages(entityId: string, subId: string, bookingId: string) {
  return useQuery({
    queryKey: ['ziload', 'messages', bookingId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/bookings/${bookingId}/messages`),
    enabled:  !!bookingId,
    refetchInterval: 15_000,
  })
}

export function useSendMessage(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/bookings/${bookingId}/messages`, body),
    onSuccess: (_d, { bookingId }) => qc.invalidateQueries({ queryKey: ['ziload', 'messages', bookingId] }),
  })
}

// ─── Rate Cards ───────────────────────────────────────────────────────────────
export function useRateCards(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['ziload', 'rate-cards', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/rate-cards`),
  })
}

export function useCreateRateCard(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/rate-cards`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ziload', 'rate-cards'] }),
  })
}
