'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, TrendingUp, AlertTriangle,
  RefreshCw, Filter, ChevronRight, Gem,
  IndianRupee, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import { useLoans, useZiPawnSub } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate, STATUS_LABEL, STATUS_COLOR } from '../lib/fmt'
import type { LoanStatus } from '../types'

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'active',       label: 'Active' },
  { key: 'interest_due', label: 'Interest Due' },
  { key: 'overdue',      label: 'Overdue' },
  { key: 'pending',      label: 'Pending' },
  { key: 'released',     label: 'Released' },
]

export default function LoanListPage() {
  const { sub, ready } = useZiPawnSub()
  const [activeTab,  setActiveTab]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const LIMIT = 20

  const { data, isLoading, error, refetch, isFetching } = useLoans({
    status: activeTab === 'all' ? undefined : activeTab,
    page, limit: LIMIT,
  })

  const loans = data?.data ?? []
  const meta  = data?.meta

  const filtered = useMemo(() => {
    if (!search.trim()) return loans
    const q = search.toLowerCase()
    return loans.filter((l: any) =>
      l.zi_code?.toLowerCase().includes(q) ||
      l.zpn_customers?.full_name?.toLowerCase().includes(q) ||
      l.zpn_customers?.mobile_last4?.includes(q) ||
      l.ref_code?.toLowerCase().includes(q)
    )
  }, [loans, search])

  // Summary stats from current page
  const stats = useMemo(() => {
    const active   = loans.filter((l: any) => l.status === 'active').length
    const overdue  = loans.filter((l: any) => l.status === 'overdue').length
    const totalOut = loans.reduce((s: number, l: any) => s + (l.outstanding_paise ?? 0), 0)
    return { active, overdue, totalOut, total: meta?.total ?? 0 }
  }, [loans, meta])

  if (!sub && ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zi-blue/10 border border-zi-blue/20
                        flex items-center justify-center">
          <Gem size={28} className="text-zi-blue" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-zi-white">ZiPawn not activated</h2>
          <p className="text-zi-muted text-sm mt-1 max-w-xs">
            Subscribe to ZiPawn from Settings → Products to start managing pawn loans.
          </p>
        </div>
        <Link href="/settings" className="btn-primary text-sm">Go to Settings</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-zi-white flex items-center gap-2">
            <Gem size={20} className="text-zi-cyan" />
            ZiPawn Loans
          </h1>
          {sub && <p className="text-zi-muted text-xs mt-0.5 font-mono">{sub.ref_code}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className={`p-2 rounded-lg border border-white/10 text-zi-muted hover:text-zi-white
                        hover:border-white/20 transition-all ${isFetching ? 'animate-spin text-zi-cyan' : ''}`}
            title="Refresh">
            <RefreshCw size={15} />
          </button>
          <Link href="/zipawn/tickets/new"
            className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={15} /> New Loan
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Total Outstanding" value={fmtPaise(stats.totalOut)}
          color="text-zi-cyan" bg="bg-zi-cyan/10" />
        <StatCard icon={TrendingUp} label="Active Loans" value={String(stats.active)}
          color="text-green-400" bg="bg-green-500/10" />
        <StatCard icon={AlertTriangle} label="Overdue" value={String(stats.overdue)}
          color="text-red-400" bg="bg-red-500/10" />
        <StatCard icon={CheckCircle2} label="Total Loans" value={String(stats.total)}
          color="text-zi-gold" bg="bg-zi-gold/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, mobile last 4…"
            className="zi-input pl-9 w-full"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all
                        ${activeTab === tab.key
                          ? 'bg-zi-blue text-white'
                          : 'text-zi-muted hover:text-zi-white hover:bg-white/5'
                        }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingSkeleton key="loading" />
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="zi-card flex items-center gap-3 text-red-400">
            <XCircle size={16} />
            <span className="text-sm">Failed to load loans. {error instanceof Error ? error.message : ''}</span>
            <button onClick={() => refetch()} className="ml-auto text-xs underline">Retry</button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="zi-card flex flex-col items-center justify-center py-16 text-center">
            <Gem size={32} className="text-zi-muted mb-3" />
            <p className="text-zi-white font-medium">No loans found</p>
            <p className="text-zi-muted text-sm mt-1">
              {activeTab !== 'all' ? `No ${STATUS_LABEL[activeTab as LoanStatus] ?? activeTab} loans` : 'Create your first loan'}
            </p>
            {activeTab === 'all' && (
              <Link href="/zipawn/tickets/new" className="btn-primary text-sm mt-4">
                <Plus size={13} className="inline mr-1" /> Create Loan
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-2">
            {filtered.map((loan: any, i: number) => (
              <LoanCard key={loan.id} loan={loan} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-zi-muted text-xs">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, meta.total)} of {meta.total} loans
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-zi-muted
                         disabled:opacity-30 hover:border-white/20 hover:text-zi-white transition-all">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
              className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-zi-muted
                         disabled:opacity-30 hover:border-white/20 hover:text-zi-white transition-all">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="zi-card flex items-center gap-3 p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-zi-muted text-xs">{label}</p>
        <p className={`font-display font-bold text-lg ${color} truncate`}>{value}</p>
      </div>
    </motion.div>
  )
}

function LoanCard({ loan, index }: { loan: any; index: number }) {
  const status: LoanStatus = loan.status
  const customer = loan.zpn_customers
  const scheme   = loan.zpn_schemes

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 24 }}>
      <Link href={`/zipawn/loans/${loan.id}`}
        className="zi-card flex items-center gap-4 hover:border-zi-blue/30 hover:bg-orbit-navy/40
                   transition-all duration-200 cursor-pointer group p-4">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          status === 'active'       ? 'bg-green-400' :
          status === 'interest_due' ? 'bg-zi-gold' :
          status === 'overdue'      ? 'bg-red-400 animate-pulse' :
          status === 'released'     ? 'bg-zi-cyan' :
          'bg-zi-muted'
        }`} />

        {/* Left: customer + codes */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-zi-white text-sm truncate">
              {customer?.full_name ?? 'Unknown Customer'}
            </p>
            <span className="text-zi-muted text-xs shrink-0">···{customer?.mobile_last4 ?? '----'}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-zi-muted text-xs font-mono">{loan.zi_code}</span>
            {scheme && (
              <span className="text-zi-muted text-xs">· {scheme.scheme_name}</span>
            )}
          </div>
        </div>

        {/* Center: Outstanding */}
        <div className="text-right hidden sm:block shrink-0">
          <p className="text-zi-muted text-xs">Outstanding</p>
          <p className="font-display font-bold text-zi-white text-base">
            {fmtPaise(loan.outstanding_paise ?? 0)}
          </p>
          <p className="text-zi-muted text-xs">
            of {fmtPaise(loan.sanctioned_paise ?? 0)}
          </p>
        </div>

        {/* Right: Maturity + Status */}
        <div className="text-right hidden md:block shrink-0">
          <p className="text-zi-muted text-xs flex items-center gap-1 justify-end">
            <Clock size={10} /> Due
          </p>
          <p className="text-zi-white text-sm">{fmtDate(loan.maturity_date)}</p>
        </div>

        <span className={`px-2 py-0.5 rounded border text-xs font-medium shrink-0
                          ${STATUS_COLOR[status] ?? 'text-zi-muted border-white/10'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>

        <ChevronRight size={14} className="text-zi-muted group-hover:text-zi-white transition-colors shrink-0" />
      </Link>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="zi-card p-4 flex items-center gap-4 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-white/10 rounded w-40" />
            <div className="h-2.5 bg-white/5 rounded w-24" />
          </div>
          <div className="hidden sm:block space-y-1 text-right">
            <div className="h-3 bg-white/10 rounded w-20 ml-auto" />
            <div className="h-2.5 bg-white/5 rounded w-14 ml-auto" />
          </div>
          <div className="h-5 w-16 bg-white/10 rounded" />
          <div className="w-3 h-3 bg-white/10 rounded" />
        </div>
      ))}
    </motion.div>
  )
}
