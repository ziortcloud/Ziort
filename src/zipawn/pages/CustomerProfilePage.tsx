'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Shield,
  CheckCircle2, Clock, XCircle, Loader2, AlertTriangle,
  Edit3, Gem, UserX, UserCheck, ChevronRight, Calendar,
  FileText, Activity,
} from 'lucide-react'
import { useCustomer, useUpdateCustomer, useZiPawnSub } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate, STATUS_LABEL, STATUS_COLOR } from '../lib/fmt'
import type { LoanStatus } from '../types'

const KYC_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  verified:  { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',  icon: CheckCircle2, label: 'Verified'  },
  pending:   { color: 'text-zi-gold',   bg: 'bg-yellow-500/10 border-yellow-500/20',icon: Clock,        label: 'Pending'   },
  submitted: { color: 'text-zi-cyan',   bg: 'bg-zi-cyan/10 border-zi-cyan/20',       icon: Clock,        label: 'Submitted' },
  rejected:  { color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20',       icon: XCircle,      label: 'Rejected'  },
  waived:    { color: 'text-zi-muted',  bg: 'bg-white/5 border-white/10',            icon: CheckCircle2, label: 'Waived'    },
}

export default function CustomerProfilePage({ customerId }: { customerId: string }) {
  const { data: customer, isLoading, error, refetch } = useCustomer(customerId)
  const updateMutation = useUpdateCustomer(customerId)
  const [activeTab, setActiveTab]   = useState<'overview' | 'kyc' | 'loans'>('overview')
  const [editing, setEditing]       = useState(false)
  const [showBlacklist, setShowBlacklist] = useState(false)

  if (isLoading) return <LoadingSkeleton />

  if (error || !customer) {
    return (
      <div className="zi-card text-center py-16">
        <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
        <p className="text-zi-white font-medium">Customer not found</p>
        <Link href="/zipawn/customers" className="btn-secondary text-sm mt-4 inline-block">
          <ArrowLeft size={13} className="inline mr-1" /> Back
        </Link>
      </div>
    )
  }

  const kyc    = KYC_CONFIG[customer.kyc_status ?? 'pending'] ?? KYC_CONFIG.pending
  const KycIcon = kyc.icon
  const loans  = customer.recent_loans ?? []

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/zipawn/customers"
          className="mt-1 p-1.5 rounded-lg border border-white/10 text-zi-muted
                     hover:text-zi-white hover:border-white/20 transition-all shrink-0">
          <ArrowLeft size={15} />
        </Link>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-zi-blue/20 border border-zi-blue/30
                          flex items-center justify-center shrink-0
                          text-zi-cyan font-display font-bold text-xl">
            {customer.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl text-zi-white leading-tight">
              {customer.full_name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="ref-code">{customer.ref_code}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium
                                ${kyc.color} ${kyc.bg}`}>
                <KycIcon size={10} /> {kyc.label}
              </span>
              {customer.is_blacklisted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border
                                 text-xs font-medium text-red-400 bg-red-500/10 border-red-500/20">
                  <UserX size={10} /> Blacklisted
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/zipawn/tickets/new?customer=${customerId}`}
            className="btn-primary text-sm flex items-center gap-1.5">
            <Gem size={13} /> New Loan
          </Link>
          <button onClick={() => setEditing(!editing)}
            className={`p-2 rounded-lg border transition-all text-sm ${
              editing
                ? 'border-zi-cyan/50 bg-zi-cyan/10 text-zi-cyan'
                : 'border-white/10 text-zi-muted hover:text-zi-white hover:border-white/20'
            }`}>
            <Edit3 size={15} />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Loans" value={String(loans.length)} icon={Gem} color="text-zi-cyan" />
        <StatChip
          label="Active"
          value={String(loans.filter((l: any) => ['active','interest_due','overdue'].includes(l.status)).length)}
          icon={Activity} color="text-green-400"
        />
        <StatChip
          label="Joined"
          value={fmtDate(customer.created_at)}
          icon={Calendar} color="text-zi-muted"
        />
        <StatChip
          label="City"
          value={customer.city ?? '—'}
          icon={MapPin} color="text-zi-muted"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {[
          { key: 'overview', label: 'Overview',    icon: User },
          { key: 'kyc',      label: 'KYC & Docs',  icon: Shield },
          { key: 'loans',    label: 'Loan History', icon: Gem },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
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

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === 'overview' && (
            <OverviewTab customer={customer} editing={editing}
              onSave={async (d) => { await updateMutation.mutateAsync(d); setEditing(false); refetch() }} />
          )}
          {activeTab === 'kyc' && (
            <KycTab customer={customer} />
          )}
          {activeTab === 'loans' && (
            <LoansTab loans={loans} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ customer, editing, onSave }: {
  customer: any; editing: boolean; onSave: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    full_name:  customer.full_name,
    email:      customer.email ?? '',
    address:    customer.address ?? '',
    city:       customer.city ?? '',
    state:      customer.state ?? '',
    pincode:    customer.pincode ?? '',
    occupation: customer.occupation ?? '',
  })

  const handleSave = () => onSave(form)

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Contact */}
      <div className="zi-card space-y-4">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <User size={14} className="text-zi-cyan" /> Personal Info
        </h3>
        {editing ? (
          <div className="space-y-3">
            {[
              { key: 'full_name', label: 'Full Name' },
              { key: 'email',     label: 'Email' },
              { key: 'address',   label: 'Address' },
              { key: 'city',      label: 'City' },
              { key: 'state',     label: 'State' },
              { key: 'pincode',   label: 'Pincode' },
              { key: 'occupation',label: 'Occupation' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-zi-muted text-xs">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="zi-input w-full text-sm" />
              </div>
            ))}
            <button onClick={handleSave}
              className="btn-primary w-full text-sm mt-2">Save Changes</button>
          </div>
        ) : (
          <div className="space-y-3">
            <Row icon={Phone}  label="Mobile" value={`···${customer.mobile_last4}`} />
            {customer.email && <Row icon={Mail}   label="Email"  value={customer.email} />}
            {customer.address && <Row icon={MapPin} label="Address" value={[customer.address, customer.city, customer.state].filter(Boolean).join(', ')} />}
            {customer.pincode && <Row icon={MapPin} label="Pincode" value={customer.pincode} />}
            {customer.occupation && <Row icon={FileText} label="Occupation" value={customer.occupation} />}
          </div>
        )}
      </div>

      {/* Nominee */}
      <div className="zi-card space-y-3">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <UserCheck size={14} className="text-zi-cyan" /> Nominee
        </h3>
        {customer.nominee_name ? (
          <>
            <DetailRow label="Name"     value={customer.nominee_name} />
            <DetailRow label="Relation" value={customer.nominee_relation ?? '—'} />
            {customer.nominee_dob && (
              <DetailRow label="DOB"    value={fmtDate(customer.nominee_dob)} />
            )}
            {customer.nominee_mobile && (
              <DetailRow label="Mobile" value={`···${customer.nominee_mobile.slice(-4)}`} />
            )}
            {customer.guardian_name && (
              <>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <p className="text-zi-muted text-xs mb-2">Guardian</p>
                  <DetailRow label="Name" value={customer.guardian_name} />
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-zi-muted text-sm">No nominee on record</p>
        )}
      </div>
    </div>
  )
}

// ─── KYC Tab ──────────────────────────────────────────────────────────────────

function KycTab({ customer }: { customer: any }) {
  const kyc = KYC_CONFIG[customer.kyc_status ?? 'pending'] ?? KYC_CONFIG.pending
  const KycIcon = kyc.icon

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="zi-card space-y-4">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <Shield size={14} className="text-zi-cyan" /> KYC Status
        </h3>
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${kyc.bg}`}>
          <KycIcon size={16} className={kyc.color} />
          <span className={`font-semibold text-sm ${kyc.color}`}>{kyc.label}</span>
        </div>
        {customer.kyc_verified_at && (
          <DetailRow label="Verified On" value={fmtDate(customer.kyc_verified_at)} />
        )}
        {customer.kyc_notes && (
          <div>
            <p className="text-zi-muted text-xs">Notes</p>
            <p className="text-zi-white text-sm mt-0.5">{customer.kyc_notes}</p>
          </div>
        )}
      </div>

      <div className="zi-card space-y-3">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <FileText size={14} className="text-zi-cyan" /> ID Documents
        </h3>
        {customer.id_type ? (
          <>
            <DetailRow label="ID Type"     value={customer.id_type?.replace('_', ' ')?.toUpperCase()} />
            {customer.id_last6 && (
              <DetailRow label="ID (last 6)" value={`••••••${customer.id_last6}`} />
            )}
            {customer.id_proof_url && (
              <a href={customer.id_proof_url} target="_blank" rel="noopener noreferrer"
                className="text-zi-cyan text-xs hover:underline flex items-center gap-1">
                View ID Proof
              </a>
            )}
          </>
        ) : (
          <p className="text-zi-muted text-sm">No ID document on record</p>
        )}
        {customer.address_proof_type && (
          <DetailRow label="Address Proof" value={customer.address_proof_type} />
        )}
        {customer.photo_url && (
          <div>
            <p className="text-zi-muted text-xs mb-1.5">Photo</p>
            <img src={customer.photo_url} alt="Customer" className="w-16 h-16 rounded-lg object-cover" />
          </div>
        )}
      </div>

      {/* Blacklist */}
      <div className="zi-card space-y-3 md:col-span-2">
        <h3 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
          <UserX size={14} className="text-red-400" /> Blacklist Status
        </h3>
        {customer.is_blacklisted ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2">
            <p className="text-red-400 text-sm font-medium">This customer is blacklisted</p>
            {customer.blacklist_reason && (
              <p className="text-zi-muted text-xs">Reason: {customer.blacklist_reason}</p>
            )}
            {customer.blacklist_expiry && (
              <p className="text-zi-muted text-xs">Expires: {fmtDate(customer.blacklist_expiry)}</p>
            )}
          </div>
        ) : (
          <p className="text-zi-muted text-sm">Customer is not blacklisted</p>
        )}
      </div>
    </div>
  )
}

// ─── Loans Tab ────────────────────────────────────────────────────────────────

function LoansTab({ loans }: { loans: any[] }) {
  return (
    <div className="space-y-2">
      {loans.length === 0 ? (
        <div className="zi-card text-center py-12">
          <Gem size={28} className="text-zi-muted mx-auto mb-3" />
          <p className="text-zi-muted text-sm">No loans on record</p>
        </div>
      ) : (
        loans.map((loan: any, i: number) => {
          const status: LoanStatus = loan.status
          return (
            <motion.div key={loan.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Link href={`/zipawn/loans/${loan.id}`}
                className="zi-card flex items-center gap-4 p-4 hover:border-zi-blue/30
                           hover:bg-orbit-navy/40 transition-all group cursor-pointer">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  status === 'active'       ? 'bg-green-400' :
                  status === 'interest_due' ? 'bg-zi-gold' :
                  status === 'overdue'      ? 'bg-red-400 animate-pulse' :
                  status === 'released'     ? 'bg-zi-cyan' :
                  'bg-zi-muted'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-zi-white font-medium text-sm">{loan.zi_code}</p>
                  <p className="text-zi-muted text-xs mt-0.5">Due {fmtDate(loan.maturity_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-zi-white font-semibold text-sm">{fmtPaise(loan.outstanding_paise)}</p>
                  <p className="text-zi-muted text-xs">outstanding</p>
                </div>
                <span className={`px-2 py-0.5 rounded border text-xs font-medium shrink-0
                                  ${STATUS_COLOR[status] ?? 'text-zi-muted border-white/10'}`}>
                  {STATUS_LABEL[status] ?? status}
                </span>
                <ChevronRight size={14} className="text-zi-muted group-hover:text-zi-white transition-colors shrink-0" />
              </Link>
            </motion.div>
          )
        })
      )}
    </div>
  )
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatChip({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="zi-card p-3 flex items-center gap-2.5">
      <Icon size={14} className={color} />
      <div className="min-w-0">
        <p className="text-zi-muted text-xs">{label}</p>
        <p className="text-zi-white font-semibold text-sm truncate">{value}</p>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={13} className="text-zi-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-zi-muted text-xs">{label}</p>
        <p className="text-zi-white">{value}</p>
      </div>
    </div>
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-full" />
        <div className="space-y-2">
          <div className="h-6 bg-white/10 rounded w-40" />
          <div className="h-3 bg-white/5 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="zi-card p-3 space-y-1.5">
            <div className="h-3 bg-white/10 rounded w-16" />
            <div className="h-4 bg-white/10 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
