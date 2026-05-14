'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/ziorbitcore/store/session'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardData {
  today: { due_count: number; collected: number; new_loans: number; upcoming: number }
  risk: { total_active: number; overdue_count: number; risk_pct: number; risk_level: 'low' | 'medium' | 'high' | 'critical' }
  profit: { weekly: number; monthly: number; yearly: number }
  overview: { total_customers: number; active_loans: number; overdue_loans: number; overdue_outstanding: number }
  chart: Array<{ month: string; loans: number; amount: number }>
  overdue_list: Array<{
    id: string; zi_code: string; customer_name: string; mobile_last4: string
    principal_paise: number; outstanding_paise: number; loan_end_date: string; days_overdue: number
  }>
}

export function useDashboard() {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-dashboard', entityId, subscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/dashboard`
      )
      if (!res.ok) throw new Error('Failed to load dashboard')
      const j = await res.json()
      return j.data as DashboardData
    },
    enabled: ready,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useZiPawnSub() {
  const session = useSessionStore(s => s.session)
  const entityId = session?.activeEntity?.id ?? ''
  const sub = session?.activeSubscriptions.find(s => s.product_code === 'ZPN') ?? null
  return { entityId, sub, subscriptionId: sub?.id ?? '', ready: !!entityId && !!sub }
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export function useLoans(params?: {
  status?: string; page?: number; limit?: number
}) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  const qs = new URLSearchParams()
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  if (params?.page)  qs.set('page',  String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))

  return useQuery({
    queryKey: ['zpn-loans', entityId, subscriptionId, params],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans?${qs}`
      )
      if (!res.ok) throw new Error('Failed to load loans')
      return res.json() as Promise<{
        data: any[];
        meta: { page: number; limit: number; total: number; pages: number }
      }>
    },
    enabled: ready,
    staleTime: 30_000,
  })
}

export function useLoan(loanId: string) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-loan', loanId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}`
      )
      if (!res.ok) throw new Error('Failed to load loan')
      const j = await res.json()
      return j.data
    },
    enabled: ready && !!loanId,
  })
}

export function useLoanPayments(loanId: string) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-payments', loanId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/payments`
      )
      if (!res.ok) throw new Error('Failed to load payments')
      const j = await res.json()
      return j.data as { payments: any[]; total: number }
    },
    enabled: ready && !!loanId,
  })
}

export function useLoanLedger(loanId: string) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-ledger', loanId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/ledger`
      )
      if (!res.ok) throw new Error('Failed to load ledger')
      const j = await res.json()
      return j.data as any[]
    },
    enabled: ready && !!loanId,
  })
}

export function useRecordPayment(loanId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      payment_amount_paise: number
      payment_date: string
      payment_mode: string
      cheque_number?: string
      transaction_ref?: string
    }) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/payments`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Payment failed')
      return j.data as { payment: any; waterfall: any; loan_after: any }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-loans'] })
      qc.invalidateQueries({ queryKey: ['zpn-loan', loanId] })
      qc.invalidateQueries({ queryKey: ['zpn-payments', loanId] })
      qc.invalidateQueries({ queryKey: ['zpn-ledger', loanId] })
    },
  })
}

// ─── Customers ────────────────────────────────────────────────────────────────

export function useCustomers(search?: string) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  const qs = new URLSearchParams()
  if (search) qs.set('q', search)

  return useQuery({
    queryKey: ['zpn-customers', entityId, subscriptionId, search],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/customers?${qs}`
      )
      if (!res.ok) throw new Error('Failed to load customers')
      const j = await res.json()
      return j.data as any[]
    },
    enabled: ready,
    staleTime: 60_000,
  })
}

export function useCustomer(customerId: string) {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-customer', customerId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/customers/${customerId}`
      )
      if (!res.ok) throw new Error('Failed to load customer')
      const j = await res.json()
      return j.data
    },
    enabled: ready && !!customerId,
  })
}

export function useCreateCustomer() {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/customers`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to create customer')
      return j.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zpn-customers'] }),
  })
}

// ─── Schemes ──────────────────────────────────────────────────────────────────

export function useUpdateCustomer(customerId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/customers/${customerId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to update customer')
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-customers'] })
      qc.invalidateQueries({ queryKey: ['zpn-customer', customerId] })
    },
  })
}

export function useRenewLoan(loanId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      renewal_type: 'tenure_extension' | 'topup' | 'refinance'
      renewal_date: string
      new_tenure_days: number
      new_interest_rate_pm?: number
      topup_paise?: number
      pay_interest_now?: boolean
      renewal_fee_paise?: number
      remarks?: string
    }) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/renew`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Renewal failed')
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-loans'] })
      qc.invalidateQueries({ queryKey: ['zpn-loan', loanId] })
      qc.invalidateQueries({ queryKey: ['zpn-dashboard'] })
    },
  })
}

export function useCloseLoan(loanId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      closure_date: string
      closure_type: 'full_payment' | 'settlement' | 'auction' | 'waiver'
      settlement_paise: number
      closure_notes?: string
      release_items?: boolean
    }) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/close`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Closure failed')
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-loans'] })
      qc.invalidateQueries({ queryKey: ['zpn-loan', loanId] })
      qc.invalidateQueries({ queryKey: ['zpn-dashboard'] })
    },
  })
}

export function useCancelLoan(loanId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { reason: string }) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/loans/${loanId}/status`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', ...body }) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Cancellation failed')
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-loans'] })
      qc.invalidateQueries({ queryKey: ['zpn-loan', loanId] })
      qc.invalidateQueries({ queryKey: ['zpn-dashboard'] })
    },
  })
}

export function useCreateScheme() {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/schemes`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to create scheme')
      return j.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zpn-schemes'] }),
  })
}

export function useUpdateScheme(schemeId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/schemes/${schemeId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to update scheme')
      return j.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zpn-schemes'] }),
  })
}

export function useDeleteScheme() {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (schemeId: string) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/schemes/${schemeId}`,
        { method: 'DELETE' }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to delete scheme')
      return j.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zpn-schemes'] }),
  })
}

export function useSchemes() {
  const { entityId, subscriptionId, ready } = useZiPawnSub()
  return useQuery({
    queryKey: ['zpn-schemes', entityId, subscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/schemes`
      )
      if (!res.ok) throw new Error('Failed to load schemes')
      const j = await res.json()
      return j.data as any[]
    },
    enabled: ready,
    staleTime: 300_000,
  })
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useCreateTicket() {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/tickets`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Failed to create ticket')
      return j.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zpn-tickets'] }),
  })
}

export function useDisburseTicket(ticketId: string) {
  const { entityId, subscriptionId } = useZiPawnSub()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/tickets/${ticketId}/disburse`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Disbursal failed')
      return j.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zpn-loans'] })
      qc.invalidateQueries({ queryKey: ['zpn-tickets'] })
    },
  })
}
