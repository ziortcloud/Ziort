'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, IndianRupee, Clock, CheckCircle2,
  AlertTriangle, CreditCard, BookOpen, Package2,
  Loader2, Gem, User, MapPin, Calendar, Percent,
  TrendingDown, Activity, RefreshCcw, Lock, XCircle,
  Printer, ChevronDown,
} from 'lucide-react'
import { useLoan, useLoanPayments, useLoanLedger } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate, STATUS_LABEL, STATUS_COLOR, PAYMENT_MODE_LABELS } from '../lib/fmt'
import PaymentModal from '../components/PaymentModal'
import RenewLoanModal from '../components/RenewLoanModal'
import CloseLoanModal from '../components/CloseLoanModal'
import CancelLoanModal from '../components/CancelLoanModal'
import type { LoanStatus } from '../types'

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: Activity },
  { key: 'payments',  label: 'Payments',  icon: CreditCard },
  { key: 'items',     label: 'Items',     icon: Package2 },
  { key: 'ledger',    label: 'Ledger',    icon: BookOpen },
]

export default function LoanDetailPage({ loanId }: { loanId: string }) {
  const { data: loan, isLoading, error } = useLoan(loanId)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPayment, setShowPayment]   = useState(false)
  const [showRenew,   setShowRenew]     = useState(false)
  const [showClose,   setShowClose]     = useState(false)
  const [showCancel,  setShowCancel]    = useState(false)

  if (isLoading) return <LoadingSkeleton />
  if (error || !loan) {
    return (
      <div className="zi-card flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle size={28} className="text-red-400 mb-3" />
        <p className="text-zi-white font-medium">Loan not found</p>
        <Link href="/zipawn/loans" className="btn-secondary text-sm mt-4">
          <ArrowLeft size={13} className="inline mr-1" /> Back to Loans
        </Link>
      </div>
    )
  }

  const status: LoanStatus = loan.status
  const customer  = loan.zpn_customers
  const branch    = loan.zi_branches
  const scheme    = loan.zpn_schemes
  const ticket    = loan.zpn_tickets
  const live      = loan.live_summary
  const isActive  = ['active','interest_due','overdue'].includes(status)
  const isPending = status === 'pending'

  const handlePrint = () => window.print()

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/zipawn/loans"
          className="mt-1 p-1.5 rounded-lg border border-white/10 text-zi-muted
                     hover:text-zi-white hover:border-white/20 transition-all shrink-0">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-2xl text-zi-white">{loan.zi_code}</h1>
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium
                              ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="text-zi-muted text-xs font-mono mt-0.5">{loan.ref_code}</p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button onClick={handlePrint}
            className="p-2 rounded-lg border border-white/10 text-zi-muted hover:text-zi-white
                       hover:border-white/20 transition-all" title="Print">
            <Printer size={15} />
          </button>
          {isActive && (
            <>
              <button onClick={() => setShowPayment(true)}
                className="btn-primary text-sm flex items-center gap-1.5">
                <IndianRupee size={14} /> Pay
              </button>
              <button onClick={() => setShowRenew(true)}
                className="btn-secondary text-sm flex items-center gap-1.5">
                <RefreshCcw size={14} /> Renew
              </button>
              <button onClick={() => setShowClose(true)}
                className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl border
                           border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                <Lock size={14} /> Close
              </button>
            </>
          )}
          {isPending && (
            <button onClick={() => setShowCancel(true)}
              className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl border
                         border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all">
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Live Summary Cards */}
      {live && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Outstanding" value={fmtPaise(loan.outstanding_paise)}
            sub={`of ${fmtPaise(loan.sanctioned_paise)}`}
            color="text-zi-white" bg="bg-zi-blue/10" icon={IndianRupee} />
          <SummaryCard label="Interest Due" value={fmtPaise(live.interest_accrued_paise)}
            sub={`${live.interest_days} days`}
            color="text-zi-gold" bg="bg-yellow-500/10" icon={Percent} />
          {live.penalty_accrued_paise > 0 ? (
            <SummaryCard label="Penalty" value={fmtPaise(live.penalty_accrued_paise)}
              sub={`${live.overdue_days} days overdue`}
              color="text-red-400" bg="bg-red-500/10" icon={AlertTriangle} />
          ) : (
            <SummaryCard label="Days to Maturity"
              value={live.days_to_maturity > 0 ? `${live.days_to_maturity}d` : 'Matured'}
              sub={fmtDate(loan.maturity_date)}
              color={live.days_to_maturity > 30 ? 'text-green-400' : 'text-zi-gold'}
              bg="bg-green-500/10" icon={Calendar} />
          )}
          <SummaryCard label="Total Due Now" value={fmtPaise(live.total_due_now_paise)}
            sub="Principal + Interest + Penalty"
            color="text-zi-cyan" bg="bg-zi-cyan/10" icon={TrendingDown} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2
                        transition-all -mb-px
                        ${activeTab === tab.key
                          ? 'border-zi-cyan text-zi-cyan'
                          : 'border-transparent text-zi-muted hover:text-zi-white'
                        }`}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === 'overview' && (
            <OverviewTab loan={loan} customer={customer} branch={branch} scheme={scheme} ticket={ticket} />
          )}
          {activeTab === 'payments' && (
            <PaymentsTab loanId={loanId} onRecord={() => setShowPayment(true)} isActive={isActive} />
          )}
          {activeTab === 'items' && (
            <ItemsTab ticket={ticket} />
          )}
          {activeTab === 'ledger' && (
            <LedgerTab loanId={loanId} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            loanId={loanId}
            outstandingPaise={loan.outstanding_paise}
            loanCode={loan.zi_code}
            customerName={customer?.full_name ?? 'Customer'}
            onClose={() => setShowPayment(false)}
          />
        )}
        {showRenew && (
          <RenewLoanModal
            loanId={loanId}
            loanCode={loan.zi_code}
            customerName={customer?.full_name ?? 'Customer'}
            outstandingPaise={loan.outstanding_paise}
            currentRatePm={parseFloat(loan.interest_rate_pm)}
            currentTenureDays={loan.tenure_days}
            maturityDate={loan.maturity_date}
            onClose={() => setShowRenew(false)}
          />
        )}
        {showClose && (
          <CloseLoanModal
            loanId={loanId}
            loanCode={loan.zi_code}
            customerName={customer?.full_name ?? 'Customer'}
            outstandingPaise={loan.outstanding_paise}
            liveTotalDuePaise={live?.total_due_now_paise ?? loan.outstanding_paise}
            onClose={() => setShowClose(false)}
          />
        )}
        {showCancel && (
          <CancelLoanModal
            loanId={loanId}
            loanCode={loan.zi_code}
            customerName={customer?.full_name ?? 'Customer'}
            onClose={() => setShowCancel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ loan, customer, branch, scheme, ticket }: any) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Loan Details */}
      <div className="zi-card space-y-3">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <Gem size={14} className="text-zi-cyan" /> Loan Details
        </h3>
        <DetailRow label="Sanctioned" value={fmtPaise(loan.sanctioned_paise)} />
        <DetailRow label="Net Disbursed" value={fmtPaise(loan.net_disbursed_paise)} />
        <DetailRow label="Interest Rate"
          value={`${parseFloat(loan.interest_rate_pm).toFixed(2)}% / month`} />
        <DetailRow label="Interest Basis" value={loan.interest_basis?.replace('_', ' ')} />
        <DetailRow label="Opened" value={fmtDate(loan.opened_at)} />
        <DetailRow label="Maturity" value={fmtDate(loan.maturity_date)} />
        {loan.closed_at && (
          <DetailRow label="Closed" value={fmtDate(loan.closed_at)} />
        )}
        {scheme && (
          <DetailRow label="Scheme" value={`${scheme.scheme_name} (${scheme.scheme_code})`} />
        )}
      </div>

      {/* Customer */}
      <div className="space-y-4">
        <div className="zi-card space-y-3">
          <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
            <User size={14} className="text-zi-cyan" /> Customer
          </h3>
          <p className="text-zi-white font-medium">{customer?.full_name}</p>
          <DetailRow label="Mobile" value={`···${customer?.mobile_last4}`} />
          <DetailRow label="KYC" value={customer?.kyc_status ?? 'pending'} />
          {customer?.city && (
            <DetailRow label="Location" value={`${customer.city}${customer.state ? ', ' + customer.state : ''}`} />
          )}
        </div>
        {branch && (
          <div className="zi-card space-y-2">
            <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
              <MapPin size={14} className="text-zi-cyan" /> Branch
            </h3>
            <p className="text-zi-white text-sm">{branch.branch_name}</p>
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="zi-card space-y-3 md:col-span-2">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <Activity size={14} className="text-zi-cyan" /> Repayment Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Total Paid" value={fmtPaise(
            (loan.total_interest_paid_paise ?? 0) +
            (loan.total_principal_paid_paise ?? 0) +
            (loan.total_penalty_paid_paise ?? 0)
          )} />
          <MiniStat label="Principal Paid" value={fmtPaise(loan.total_principal_paid_paise ?? 0)} />
          <MiniStat label="Interest Paid" value={fmtPaise(loan.total_interest_paid_paise ?? 0)} />
          <MiniStat label="Payments" value={String(loan.payment_count ?? 0)} />
        </div>
        {loan.last_payment_at && (
          <p className="text-zi-muted text-xs">Last payment: {fmtDate(loan.last_payment_at)}</p>
        )}
      </div>
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ loanId, onRecord, isActive }: {
  loanId: string; onRecord: () => void; isActive: boolean
}) {
  const { data, isLoading } = useLoanPayments(loanId)
  const payments = data?.payments ?? []

  return (
    <div className="space-y-3">
      {isActive && (
        <div className="flex justify-end">
          <button onClick={onRecord} className="btn-primary text-sm flex items-center gap-1.5">
            <IndianRupee size={14} /> Record Payment
          </button>
        </div>
      )}
      {isLoading ? (
        <div className="text-center py-12 text-zi-muted">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading payments…
        </div>
      ) : payments.length === 0 ? (
        <div className="zi-card text-center py-12">
          <CreditCard size={28} className="text-zi-muted mx-auto mb-3" />
          <p className="text-zi-muted text-sm">No payments recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="zi-card p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20
                              flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zi-white text-sm font-medium">{p.payment_code}</p>
                <p className="text-zi-muted text-xs">{fmtDate(p.payment_date)} · {PAYMENT_MODE_LABELS[p.payment_mode] ?? p.payment_mode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-green-400">
                  +{fmtPaise(p.payment_amount_paise)}
                </p>
                <p className="text-zi-muted text-xs">
                  Balance: {fmtPaise(p.outstanding_after_paise)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

function ItemsTab({ ticket }: { ticket: any }) {
  const items = ticket?.zpn_items ?? []

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="zi-card text-center py-12">
          <Package2 size={28} className="text-zi-muted mx-auto mb-3" />
          <p className="text-zi-muted text-sm">No items recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="zi-card p-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-zi-gold/10 border border-zi-gold/20
                              flex items-center justify-center shrink-0">
                <Gem size={14} className="text-zi-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zi-white text-sm font-medium capitalize">{item.category?.replace('_', ' ')}</p>
                <p className="text-zi-muted text-xs mt-0.5">{item.description}</p>
                {(item.weight_grams || item.purity) && (
                  <p className="text-zi-muted text-xs">
                    {item.weight_grams ? `${item.weight_grams}g` : ''}{item.purity ? ` · ${item.purity}` : ''}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-zi-muted text-xs">Item code</p>
                <p className="text-zi-white text-xs font-mono">{item.item_code ?? '—'}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────

function LedgerTab({ loanId }: { loanId: string }) {
  const { data, isLoading } = useLoanLedger(loanId)

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-center py-12 text-zi-muted">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading ledger…
        </div>
      ) : !data || (data as any).ledger?.length === 0 ? (
        <div className="zi-card text-center py-12">
          <BookOpen size={28} className="text-zi-muted mx-auto mb-3" />
          <p className="text-zi-muted text-sm">No ledger entries</p>
        </div>
      ) : (
        <div className="space-y-2">
          {((data as any).ledger ?? []).map((entry: any, i: number) => (
            <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="zi-card p-3.5 flex items-center gap-3 text-sm">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                entry.entry_type === 'payment'    ? 'bg-green-400' :
                entry.entry_type === 'disbursal'  ? 'bg-zi-blue' :
                entry.entry_type === 'interest'   ? 'bg-zi-gold' :
                entry.entry_type === 'penalty'    ? 'bg-red-400' :
                'bg-zi-muted'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-zi-white capitalize">{entry.entry_type?.replace('_', ' ')}</p>
                {entry.narration && (
                  <p className="text-zi-muted text-xs truncate">{entry.narration}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-zi-muted text-xs">{fmtDate(entry.entry_date)}</p>
                <p className={`font-medium ${entry.credit_paise > 0 ? 'text-green-400' : 'text-zi-white'}`}>
                  {entry.credit_paise > 0
                    ? `+${fmtPaise(entry.credit_paise)}`
                    : `-${fmtPaise(entry.debit_paise)}`
                  }
                </p>
              </div>
              <div className="text-right shrink-0 pl-4 border-l border-white/5">
                <p className="text-zi-muted text-xs">Balance</p>
                <p className="text-zi-white text-sm">{fmtPaise(entry.balance_paise)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared Atoms ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color, bg, icon: Icon }: {
  label: string; value: string; sub: string; color: string; bg: string; icon: React.ElementType
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="zi-card p-4 space-y-1">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon size={13} className={color} />
      </div>
      <p className={`font-display font-bold text-lg leading-tight ${color}`}>{value}</p>
      <p className="text-zi-muted text-xs">{label}</p>
      <p className="text-zi-muted text-[10px]">{sub}</p>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-zi-muted shrink-0">{label}</span>
      <span className="text-zi-white text-right">{value ?? '—'}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zi-muted text-xs">{label}</p>
      <p className="text-zi-white font-display font-semibold">{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-4 items-center">
        <div className="w-8 h-8 bg-white/10 rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 bg-white/10 rounded w-32" />
          <div className="h-3 bg-white/5 rounded w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="zi-card p-4 space-y-2">
            <div className="w-7 h-7 bg-white/10 rounded-lg" />
            <div className="h-5 bg-white/10 rounded w-24" />
            <div className="h-3 bg-white/5 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
