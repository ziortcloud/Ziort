import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiGetPaged, apiPost, apiPatch } from '../../../core/api/client'

const base = (entityId: string, subId: string) => `/entities/${entityId}/zifleet/${subId}`

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export function useVehicles(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zifleet', 'vehicles', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/vehicles`, params),
  })
}

export function useVehicle(entityId: string, subId: string, vehicleId: string) {
  return useQuery({
    queryKey: ['zifleet', 'vehicle', vehicleId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/vehicles/${vehicleId}`),
    enabled:  !!vehicleId,
  })
}

export function useCreateVehicle(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/vehicles`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zifleet', 'vehicles'] }),
  })
}

export function useUpdateVehicle(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vehicleId, body }: { vehicleId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/vehicles/${vehicleId}`, body),
    onSuccess: (_d, { vehicleId }) => {
      qc.invalidateQueries({ queryKey: ['zifleet', 'vehicles'] })
      qc.invalidateQueries({ queryKey: ['zifleet', 'vehicle', vehicleId] })
    },
  })
}

export function useVehicleMaintenance(entityId: string, subId: string, vehicleId: string) {
  return useQuery({
    queryKey: ['zifleet', 'vehicle-maintenance', vehicleId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/vehicles/${vehicleId}/maintenance`),
    enabled:  !!vehicleId,
  })
}

export function useAddVehicleMaintenance(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vehicleId, body }: { vehicleId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/vehicles/${vehicleId}/maintenance`, body),
    onSuccess: (_d, { vehicleId }) => {
      qc.invalidateQueries({ queryKey: ['zifleet', 'vehicle-maintenance', vehicleId] })
      qc.invalidateQueries({ queryKey: ['zifleet', 'maintenance'] })
    },
  })
}

// ─── Drivers ──────────────────────────────────────────────────────────────────
export function useDrivers(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zifleet', 'drivers', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/drivers`, params),
  })
}

export function useDriver(entityId: string, subId: string, driverId: string) {
  return useQuery({
    queryKey: ['zifleet', 'driver', driverId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/drivers/${driverId}`),
    enabled:  !!driverId,
  })
}

export function useCreateDriver(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/drivers`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zifleet', 'drivers'] }),
  })
}

export function useUpdateDriver(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ driverId, body }: { driverId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/drivers/${driverId}`, body),
    onSuccess: (_d, { driverId }) => {
      qc.invalidateQueries({ queryKey: ['zifleet', 'drivers'] })
      qc.invalidateQueries({ queryKey: ['zifleet', 'driver', driverId] })
    },
  })
}

// ─── Trips ────────────────────────────────────────────────────────────────────
export function useTrips(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zifleet', 'trips', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/trips`, params),
  })
}

export function useTrip(entityId: string, subId: string, tripId: string) {
  return useQuery({
    queryKey: ['zifleet', 'trip', tripId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/trips/${tripId}`),
    enabled:  !!tripId,
  })
}

export function useCreateTrip(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/trips`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zifleet', 'trips'] }),
  })
}

export function useUpdateTrip(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/trips/${tripId}`, body),
    onSuccess: (_d, { tripId }) => {
      qc.invalidateQueries({ queryKey: ['zifleet', 'trip', tripId] })
      qc.invalidateQueries({ queryKey: ['zifleet', 'trips'] })
    },
  })
}

export function useAdvanceTripStatus(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: string; body: { status: string; note?: string } }) =>
      apiPost<any>(`${base(entityId, subId)}/trips/${tripId}/status`, body),
    onSuccess: (_d, { tripId }) => {
      qc.invalidateQueries({ queryKey: ['zifleet', 'trip', tripId] })
      qc.invalidateQueries({ queryKey: ['zifleet', 'trips'] })
    },
  })
}

export function useAddTripExpense(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/trips/${tripId}/expenses`, body),
    onSuccess: (_d, { tripId }) => qc.invalidateQueries({ queryKey: ['zifleet', 'trip', tripId] }),
  })
}

export function useAddFuelLog(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/trips/${tripId}/fuel`, body),
    onSuccess: (_d, { tripId }) => qc.invalidateQueries({ queryKey: ['zifleet', 'trip', tripId] }),
  })
}

export function useAddTripPayment(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, body }: { tripId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/trips/${tripId}/payments`, body),
    onSuccess: (_d, { tripId }) => qc.invalidateQueries({ queryKey: ['zifleet', 'trip', tripId] }),
  })
}

// ─── Maintenance (fleet-wide) ─────────────────────────────────────────────────
export function useAllMaintenance(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zifleet', 'maintenance', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/maintenance`, params),
  })
}
