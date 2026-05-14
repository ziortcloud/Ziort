'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UserPlus, User, Phone, CheckCircle2,
  Clock, XCircle, ChevronRight, Loader2, Users,
} from 'lucide-react'
import { useCustomers, useZiPawnSub } from '../hooks/use-zipawn'
import { fmtDate } from '../lib/fmt'

export default function CustomerListPage() {
  const { sub } = useZiPawnSub()
  const [search, setSearch] = useState('')
  const { data: customers = [], isLoading } = useCustomers(search)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-zi-white flex items-center gap-2">
            <Users size={20} className="text-zi-cyan" /> Customers
          </h1>
          {sub && <p className="text-zi-muted text-xs mt-0.5 font-mono">{sub.ref_code}</p>}
        </div>
        <Link href="/zipawn/customers/new" className="btn-primary text-sm flex items-center gap-1.5">
          <UserPlus size={14} /> Add Customer
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or last 4 digits of mobile…"
          className="zi-input pl-9 w-full"
        />
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="zi-card p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-32" />
                  <div className="h-2.5 bg-white/5 rounded w-20" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : customers.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="zi-card flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-zi-muted mb-3" />
            <p className="text-zi-white font-medium">No customers found</p>
            <p className="text-zi-muted text-sm mt-1">
              {search ? 'Try a different search' : 'Add your first customer to get started'}
            </p>
            {!search && (
              <Link href="/zipawn/customers/new" className="btn-primary text-sm mt-4">
                <UserPlus size={13} className="inline mr-1" /> Add Customer
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-2">
            {customers.map((c: any, i: number) => (
              <CustomerCard key={c.id} customer={c} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CustomerCard({ customer: c, index }: { customer: any; index: number }) {
  const kyc = c.kyc_status ?? 'pending'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 24 }}>
      <Link href={`/zipawn/customers/${c.id}`}
        className="zi-card flex items-center gap-4 p-4 hover:border-zi-blue/30
                   hover:bg-orbit-navy/40 transition-all group cursor-pointer">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-zi-blue/20 border border-zi-blue/30
                        flex items-center justify-center shrink-0 text-zi-cyan font-display font-bold">
          {c.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-zi-white font-medium text-sm">{c.full_name}</p>
          <p className="text-zi-muted text-xs flex items-center gap-1 mt-0.5">
            <Phone size={10} /> ···{c.mobile_last4}
            {c.city && <span className="ml-2">· {c.city}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <KycBadge status={kyc} />
          <span className="text-zi-muted text-xs hidden sm:block">
            {fmtDate(c.created_at)}
          </span>
          <ChevronRight size={14}
            className="text-zi-muted group-hover:text-zi-white transition-colors" />
        </div>
      </Link>
    </motion.div>
  )
}

function KycBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    verified:  { icon: CheckCircle2, color: 'text-green-400', label: 'KYC' },
    pending:   { icon: Clock,        color: 'text-zi-gold',   label: 'Pending' },
    rejected:  { icon: XCircle,      color: 'text-red-400',   label: 'Rejected' },
  }
  const cfg = map[status] ?? map.pending
  const Icon = cfg.icon
  return (
    <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}
