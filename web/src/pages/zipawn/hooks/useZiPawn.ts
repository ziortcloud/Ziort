import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiGetPaged, apiPost, apiPatch, apiDelete } from '../../../core/api/client'

const base = (entityId: string, subId: string) =>
  `/entities/${entityId}/zipawn/${subId}`

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useDashboard(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'dashboard', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/dashboard`),
    staleTime: 30_000,
  })
}

// ─── Loans ────────────────────────────────────────────────────────────────────
export function useLoans(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zipawn', 'loans', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/loans`, params),
  })
}

export function useLoan(entityId: string, subId: string, loanId: string) {
  return useQuery({
    queryKey: ['zipawn', 'loan', loanId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/loans/${loanId}`),
    enabled:  !!loanId,
  })
}

export function useCreateLoan(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/loans`, body),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
    },
  })
}

export function useRenewLoan(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loanId, body }: { loanId: string; body: any }) =>
      apiPost(`${base(entityId, subId)}/loans/${loanId}/renew`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
    },
  })
}

export function useCloseLoan(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loanId, body }: { loanId: string; body: any }) =>
      apiPost(`${base(entityId, subId)}/loans/${loanId}/close`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
    },
  })
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export function usePayments(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zipawn', 'payments', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/payments`, params),
  })
}

export function useLoanPayments(entityId: string, subId: string, loanId: string) {
  return useQuery({
    queryKey: ['zipawn', 'loan-payments', loanId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/loans/${loanId}/payments`),
    enabled:  !!loanId,
  })
}

export function useTakePayment(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ loanId, body }: { loanId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/loans/${loanId}/payments`, body),
    onSuccess: (_data, { loanId }) => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loan', loanId] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'payments'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
    },
  })
}

// ─── Customers ────────────────────────────────────────────────────────────────
export function useCustomers(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zipawn', 'customers', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/customers`, params),
  })
}

export function useCustomer(entityId: string, subId: string, customerId: string) {
  return useQuery({
    queryKey: ['zipawn', 'customer', customerId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/customers/${customerId}`),
    enabled:  !!customerId,
  })
}

export function useCreateCustomer(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/customers`, body),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'customers'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
    },
  })
}

export function useUpdateCustomer(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/customers/${id}`, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'customers'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'customer', id] })
    },
  })
}

// ─── Schemes ──────────────────────────────────────────────────────────────────
export function useSchemes(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'schemes', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/schemes`),
  })
}

export function useCreateScheme(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/schemes`, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'schemes'] }),
  })
}

export function useUpdateScheme(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/schemes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zipawn', 'schemes'] }),
  })
}

export function useDeleteScheme(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`${base(entityId, subId)}/schemes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'schemes'] }),
  })
}

// ─── Gold / Metal Rates ───────────────────────────────────────────────────────
export function useGoldRates(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'gold-rates', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/metal-rates`),
    staleTime: 60_000,
  })
}

export function useUpdateGoldRate(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/metal-rates`, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'gold-rates'] }),
  })
}

// ─── Overdue Alerts / Reminders ───────────────────────────────────────────────
export function useOverdueAlerts(entityId: string, subId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zipawn', 'overdue', entityId, subId, params],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/loans`, { status: 'overdue', ...params }),
    staleTime: 30_000,
  })
}

export function useSendReminder(entityId: string, subId: string) {
  return useMutation({
    mutationFn: ({ loanId, channel }: { loanId: string; channel: 'sms' | 'whatsapp' | 'email' }) =>
      apiPost(`${base(entityId, subId)}/loans/${loanId}/remind`, { channel }),
  })
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export function useReport(entityId: string, subId: string, reportType: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['zipawn', 'report', entityId, subId, reportType, params],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/reports/${reportType}`, params),
    enabled:  !!reportType,
    staleTime: 60_000,
  })
}

// ─── Branches ─────────────────────────────────────────────────────────────────
export function useBranches(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'branches', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/branches`),
  })
}

export function useCreateBranch(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/branches`, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'branches'] }),
  })
}

export function useUpdateBranch(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiPatch<any>(`${base(entityId, subId)}/branches/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zipawn', 'branches'] }),
  })
}

// ─── Branding / Vendor Settings ───────────────────────────────────────────────
export function useVendorSettings(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'vendor', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/settings/vendor`),
  })
}

export function useUpdateVendorSettings(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPatch<any>(`${base(entityId, subId)}/settings/vendor`, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'vendor'] }),
  })
}

// ─── Communication Settings ───────────────────────────────────────────────────
export function useCommsSettings(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'comms', entityId, subId],
    queryFn:  () => apiGet<any>(`${base(entityId, subId)}/settings/communication`),
  })
}

export function useUpdateCommsSettings(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPatch<any>(`${base(entityId, subId)}/settings/communication`, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['zipawn', 'comms'] }),
  })
}

// ─── Entity Branches (entity-level, used for ticket creation) ────────────────
export function useEntityBranches(entityId: string) {
  return useQuery({
    queryKey: ['entity-branches', entityId],
    queryFn:  () => apiGet<any>(`/entities/${entityId}/branches`),
    staleTime: 300_000,
  })
}

// ─── Tickets (multi-step: create → items → valuations → disburse) ─────────────
export function useCreateTicket(entityId: string, subId: string) {
  return useMutation({
    mutationFn: (body: { customer_id: string; branch_id: string; scheme_id?: string | null }) =>
      apiPost<any>(`${base(entityId, subId)}/tickets`, body),
  })
}

export function useAddTicketItem(entityId: string, subId: string) {
  return useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/tickets/${ticketId}/items`, body),
  })
}

export function useAddTicketValuation(entityId: string, subId: string) {
  return useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/tickets/${ticketId}/valuations`, body),
  })
}

export function useDisburseTicket(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: any }) =>
      apiPost<any>(`${base(entityId, subId)}/tickets/${ticketId}/disburse`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'dashboard'] })
    },
  })
}

// ─── Migration ────────────────────────────────────────────────────────────────
export function useMigrationBatches(entityId: string, subId: string) {
  return useQuery({
    queryKey: ['zipawn', 'migration-batches', entityId, subId],
    queryFn:  () => apiGetPaged<any>(`${base(entityId, subId)}/migration/batches`),
  })
}

export function useCreateMigrationLoan(entityId: string, subId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: any) => apiPost<any>(`${base(entityId, subId)}/migration/loans`, body),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['zipawn', 'loans'] })
      qc.invalidateQueries({ queryKey: ['zipawn', 'migration-batches'] })
    },
  })
}
