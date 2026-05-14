import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, CheckSquare, XSquare, Receipt } from 'lucide-react'
import { useLoan, useRenewLoan, useCloseLoan } from '../hooks/useZiPawn'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

export default function LoanDetailPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const { loanId } = useParams<{ loanId: string }>()
  const { data: loan, isLoading } = useLoan(entityId, subscriptionId, loanId!)
  const renewMutation = useRenewLoan(entityId, subscriptionId)
  const closeMutation = useCloseLoan(entityId, subscriptionId)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  if (isLoading) return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-8 w-48 bg-orbit-deep rounded" />
      <div className="h-40 bg-orbit-deep rounded-xl" />
    </div>
  )

  if (!loan) return (
    <div className="p-6 text-center text-zi-muted">Loan not found</div>
  )

  const outstanding = (loan.outstanding_paise || 0) / 100
  const principal   = (loan.sanctioned_paise  || 0) / 100
  const isActive    = ['active', 'overdue'].includes(loan.status)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-zi-muted hover:text-zi-white transition-colors">
        <ArrowLeft size={14} /> Back to Loans
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-zi-white font-mono">{loan.zi_code}</h1>
            <StatusBadge status={loan.status} />
          </div>
          <p className="text-sm text-zi-muted">
            {loan.zpn_customers?.full_name} · {loan.zpn_schemes?.scheme_name}
          </p>
        </div>

        {isActive && (
          <div className="flex gap-2">
            <button onClick={() => setShowRenewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zi-blue/15 hover:bg-zi-blue/25 border border-zi-blue/20 rounded-lg text-sm text-zi-blue transition-colors">
              <RefreshCw size={14} /> Renew
            </button>
            <button onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 rounded-lg text-sm text-green-400 transition-colors">
              <CheckSquare size={14} /> Close
            </button>
          </div>
        )}
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Principal',    value: `₹${principal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,   color: 'text-zi-white' },
          { label: 'Outstanding',  value: `₹${outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-red-400'  },
          { label: 'Interest Rate', value: `${loan.interest_rate_pm}% / mo`,                                       color: 'text-zi-white' },
          { label: 'Maturity',     value: loan.maturity_date ? format(new Date(loan.maturity_date), 'dd MMM yyyy') : '—', color: 'text-zi-white' },
        ].map(f => (
          <div key={f.label} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
            <p className="text-[10px] text-zi-muted uppercase tracking-wider mb-1">{f.label}</p>
            <p className={`text-lg font-bold tabular-nums ${f.color}`}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Items pledged */}
      {loan.items?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted mb-3">Pledged Items</p>
          <div className="space-y-2">
            {loan.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-orbit-deep border border-white/5">
                <div>
                  <p className="text-sm font-medium text-zi-white">{item.item_name}</p>
                  <p className="text-xs text-zi-muted">{item.metal_type} · {item.gross_weight_g}g · {item.purity}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zi-white tabular-nums">
                    ₹{((item.appraised_value_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-zi-muted">appraised</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      {loan.payments?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted mb-3">Payment History</p>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-orbit-deep">
                  {['Date', 'Amount', 'Principal', 'Interest', 'Penalty', 'Mode'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-zi-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loan.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/3 hover:bg-orbit-deep/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-zi-muted">{p.paid_at ? format(new Date(p.paid_at), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-green-400 font-semibold">₹{((p.total_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-2.5 tabular-nums text-zi-white">₹{((p.principal_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-2.5 tabular-nums text-zi-white">₹{((p.interest_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-2.5 tabular-nums text-orange-400">₹{((p.penalty_paid_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-2.5 text-xs text-zi-muted capitalize">{p.payment_mode || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <QuickActionModal
          title="Renew Loan"
          description="This will calculate interest to date and renew the loan for a new term."
          confirmLabel="Renew"
          confirmClass="bg-zi-blue hover:bg-zi-blue/90"
          onConfirm={async () => {
            await renewMutation.mutateAsync({ loanId: loan.id, body: { payment_mode: 'cash' } })
            setShowRenewModal(false)
            toast.success('Loan renewed successfully')
          }}
          onCancel={() => setShowRenewModal(false)}
          loading={renewMutation.isPending}
        />
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <QuickActionModal
          title="Close Loan"
          description={`Outstanding amount: ₹${outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}. Closing will release the pledged items.`}
          confirmLabel="Close Loan"
          confirmClass="bg-green-600 hover:bg-green-600/90"
          onConfirm={async () => {
            await closeMutation.mutateAsync({ loanId: loan.id, body: { payment_mode: 'cash' } })
            setShowCloseModal(false)
            navigate('/zipawn/loans')
            toast.success('Loan closed successfully')
          }}
          onCancel={() => setShowCloseModal(false)}
          loading={closeMutation.isPending}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:  'bg-green-500/15 text-green-400 border-green-500/20',
    overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
    closed:  'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[status] ?? map.closed}`}>{status}</span>
}

function QuickActionModal({ title, description, confirmLabel, confirmClass, onConfirm, onCancel, loading }: {
  title: string; description: string; confirmLabel: string; confirmClass: string
  onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-midnight/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-orbit-deep border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-zi-white mb-2">{title}</h3>
        <p className="text-sm text-zi-muted mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmClass}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
