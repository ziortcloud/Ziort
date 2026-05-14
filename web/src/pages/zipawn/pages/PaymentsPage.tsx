// ZiPawn Payments — transaction list + inline take-payment drawer
import { useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { usePayments, useTakePayment, useLoans } from '../hooks/useZiPawn'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const MODE_OPTS = ['', 'cash', 'upi', 'bank_transfer', 'cheque']

export default function PaymentsPage({ entityId, subscriptionId }: Props) {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [mode, setMode]       = useState('')
  const [showDrawer, setShowDrawer] = useState(false)

  const { data, isLoading, refetch } = usePayments(entityId, subscriptionId, {
    search: search || undefined, page, limit: 25, payment_mode: mode || undefined,
  })

  const payments = data?.data ?? []
  const meta     = data?.meta

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Payments</h1>
          <p className="text-xs text-zi-muted">{meta ? `${meta.total.toLocaleString('en-IN')} transactions` : '—'}</p>
        </div>
        <button onClick={() => setShowDrawer(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-600/90 rounded-lg text-sm font-medium text-white transition-colors">
          Take Payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by loan ID or customer…"
            className="w-full pl-8 pr-3 py-2 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white
                       placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/30 transition-colors" />
        </div>
        <div className="relative">
          <select value={mode} onChange={e => { setMode(e.target.value); setPage(1) }}
            className="pl-3 pr-7 py-2 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/30 transition-colors appearance-none cursor-pointer">
            <option value="">All modes</option>
            {MODE_OPTS.filter(Boolean).map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zi-muted pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-orbit-deep">
              {['Date', 'Loan', 'Customer', 'Amount', 'Principal', 'Interest', 'Penalty', 'Mode'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zi-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-white/3 animate-pulse">
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-orbit-deep rounded w-16" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && payments.map((p: any) => (
              <tr key={p.id} className="border-b border-white/3 hover:bg-orbit-deep/50 transition-colors">
                <td className="px-4 py-3 text-xs text-zi-muted whitespace-nowrap">
                  {p.paid_at ? format(new Date(p.paid_at), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zi-cyan">{p.loan?.zi_code ?? '—'}</td>
                <td className="px-4 py-3 text-zi-white text-xs">{p.loan?.customer?.full_name ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-green-400">
                  ₹{((p.total_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 tabular-nums text-zi-white text-xs">
                  ₹{((p.principal_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 tabular-nums text-zi-white text-xs">
                  ₹{((p.interest_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 tabular-nums text-orange-400 text-xs">
                  ₹{((p.penalty_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-xs text-zi-muted capitalize">{(p.payment_mode || '—').replace('_', ' ')}</td>
              </tr>
            ))}
            {!isLoading && payments.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-sm text-zi-muted">No payments found</td></tr>
            )}
          </tbody>
        </table>

        {meta && meta.total > meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 bg-orbit-deep border-t border-white/5">
            <p className="text-xs text-zi-muted">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy disabled:opacity-40 transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * meta.limit >= meta.total}
                className="px-3 py-1.5 rounded text-xs text-zi-muted hover:text-zi-white hover:bg-orbit-navy disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showDrawer && (
        <TakePaymentDrawer
          entityId={entityId}
          subscriptionId={subscriptionId}
          onClose={() => setShowDrawer(false)}
          onSuccess={() => { setShowDrawer(false); refetch() }}
        />
      )}
    </div>
  )
}

function TakePaymentDrawer({ entityId, subscriptionId, onClose, onSuccess }: {
  entityId: string; subscriptionId: string; onClose: () => void; onSuccess: () => void
}) {
  const { data: loansData } = useLoans(entityId, subscriptionId, { status: 'active', limit: 100 })
  const takePmt = useTakePayment(entityId, subscriptionId)
  const loans   = loansData?.data ?? []

  const [loanId, setLoanId] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode]     = useState('cash')
  const [saving, setSaving] = useState(false)

  const selectedLoan = loans.find((l: any) => l.id === loanId)
  const outstanding  = selectedLoan ? (selectedLoan.outstanding_paise || 0) / 100 : 0

  async function submit() {
    if (!loanId)  { toast.error('Select a loan'); return }
    if (!amount)  { toast.error('Enter amount'); return }
    setSaving(true)
    try {
      await takePmt.mutateAsync({
        loanId,
        body: { total_paid_paise: Math.round(parseFloat(amount) * 100), payment_mode: mode },
      })
      toast.success('Payment recorded')
      onSuccess()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Payment failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-orbit-midnight/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-orbit-deep border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-zi-white">Take Payment</h3>
          <button onClick={onClose} className="p-1 text-zi-muted hover:text-zi-white transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Loan *</label>
            <select value={loanId} onChange={e => setLoanId(e.target.value)}
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors">
              <option value="">Select active loan…</option>
              {loans.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.zi_code} — {l.zpn_customers?.full_name} (₹{((l.outstanding_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })} due)
                </option>
              ))}
            </select>
            {outstanding > 0 && (
              <p className="mt-1 text-xs text-zi-muted">Outstanding: <span className="text-red-400 font-semibold">₹{outstanding.toLocaleString('en-IN')}</span></p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Amount (₹) *</label>
            <div className="flex gap-2">
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
              {outstanding > 0 && (
                <button onClick={() => setAmount(String(outstanding))}
                  className="px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-cyan transition-colors">
                  Full
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {['cash', 'upi', 'bank_transfer', 'cheque'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium capitalize transition-colors
                    ${mode === m ? 'bg-zi-blue text-white' : 'bg-orbit-navy border border-white/8 text-zi-muted hover:text-zi-white'}`}>
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center py-2.5 bg-emerald-600 hover:bg-emerald-600/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
