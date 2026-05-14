import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter } from 'lucide-react'
import { useLoans } from '../hooks/useZiPawn'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const STATUS_TABS = [
  { key: '',         label: 'All'     },
  { key: 'active',   label: 'Active'  },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'closed',   label: 'Closed'  },
]

export default function LoansPage({ entityId, subscriptionId }: Props) {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const [status, setStatus] = useState(params.get('status') || '')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useLoans(entityId, subscriptionId, {
    status: status || undefined, page, limit: 25,
  })

  const loans = data?.data ?? []
  const meta  = data?.meta

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Loans</h1>
          <p className="text-xs text-zi-muted">
            {meta ? `${meta.total.toLocaleString('en-IN')} total` : '—'}
          </p>
        </div>
        <button onClick={() => navigate('/zipawn/tickets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> New Loan
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center bg-orbit-deep border border-white/5 rounded-lg p-0.5">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => { setStatus(t.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${status === t.key ? 'bg-orbit-navy text-zi-white' : 'text-zi-muted hover:text-zi-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search loans, customers…"
            className="w-full pl-8 pr-3 py-2 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white
                       placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/30 transition-colors" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-orbit-deep">
              {['Loan ID', 'Customer', 'Principal', 'Outstanding', 'Status', 'Opened', 'Maturity'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zi-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-white/3 animate-pulse">
                {[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-orbit-deep rounded w-20" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && loans.map((loan: any) => (
              <tr key={loan.id}
                onClick={() => navigate(`/zipawn/loans/${loan.id}`)}
                className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-zi-cyan">{loan.zi_code}</td>
                <td className="px-4 py-3 text-zi-white font-medium">{loan.zpn_customers?.full_name}</td>
                <td className="px-4 py-3 tabular-nums text-zi-white">
                  ₹{((loan.sanctioned_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 tabular-nums text-zi-white">
                  ₹{((loan.outstanding_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={loan.status} />
                </td>
                <td className="px-4 py-3 text-zi-muted text-xs">
                  {loan.opened_at ? format(new Date(loan.opened_at), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-zi-muted text-xs">
                  {loan.maturity_date ? format(new Date(loan.maturity_date), 'dd MMM yyyy') : '—'}
                </td>
              </tr>
            ))}

            {!isLoading && loans.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-zi-muted">
                  No loans found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.total > meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 bg-orbit-deep border-t border-white/5">
            <p className="text-xs text-zi-muted">
              Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-md text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * meta.limit >= meta.total}
                className="px-3 py-1.5 rounded-md text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:   'bg-green-500/15 text-green-400 border-green-500/20',
    overdue:  'bg-red-500/15 text-red-400 border-red-500/20',
    npa:      'bg-orange-500/15 text-orange-400 border-orange-500/20',
    closed:   'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
    cancelled:'bg-zi-muted/10 text-zi-muted/60 border-zi-muted/10',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${map[status] ?? map.closed}`}>
      {status}
    </span>
  )
}
