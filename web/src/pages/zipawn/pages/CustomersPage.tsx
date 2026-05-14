import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { useCustomers } from '../hooks/useZiPawn'

interface Props { entityId: string; subscriptionId: string }

export default function CustomersPage({ entityId, subscriptionId }: Props) {
  const navigate      = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useCustomers(entityId, subscriptionId, {
    search: search || undefined, page, limit: 30,
  })

  const customers = data?.data ?? []
  const meta      = data?.meta

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Customers</h1>
          <p className="text-xs text-zi-muted">{meta ? `${meta.total.toLocaleString('en-IN')} total` : '—'}</p>
        </div>
        <button onClick={() => navigate('/zipawn/customers/new')}
          className="flex items-center gap-2 px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 rounded-lg text-sm font-medium text-white transition-colors">
          <UserPlus size={14} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, mobile, Aadhaar…"
          className="w-full pl-8 pr-3 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white
                     placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/30 transition-colors" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && [...Array(9)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-orbit-deep border border-white/5 animate-pulse" />
        ))}

        {!isLoading && customers.map((c: any) => (
          <button key={c.id} onClick={() => navigate(`/zipawn/customers/${c.id}`)}
            className="text-left p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-zi-cyan/20 hover:bg-orbit-navy/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zi-blue/15 flex items-center justify-center text-sm font-bold text-zi-blue shrink-0">
                {c.full_name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zi-white truncate group-hover:text-zi-cyan transition-colors">
                  {c.full_name}
                </p>
                <p className="text-xs text-zi-muted">{c.mobile_last4 ? `×× ${c.mobile_last4}` : '—'}</p>
              </div>
              <div className="ml-auto shrink-0">
                <KycBadge status={c.kyc_status} />
              </div>
            </div>
            {c.active_loans > 0 && (
              <p className="mt-2 text-[11px] text-zi-muted pl-13">
                {c.active_loans} active loan{c.active_loans !== 1 ? 's' : ''}
              </p>
            )}
          </button>
        ))}

        {!isLoading && customers.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-zi-muted">
            {search ? `No customers matching "${search}"` : 'No customers yet'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zi-muted">
            {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-md text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy disabled:opacity-40 transition-colors">
              Previous
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * meta.limit >= meta.total}
              className="px-3 py-1.5 rounded-md text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy disabled:opacity-40 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function KycBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified:    { label: 'KYC', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
    pending:     { label: 'Pending', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    not_started: { label: 'No KYC', cls: 'bg-zi-muted/10 text-zi-muted/60 border-transparent' },
  }
  const { label, cls } = map[status] ?? map.not_started
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${cls}`}>{label}</span>
}
