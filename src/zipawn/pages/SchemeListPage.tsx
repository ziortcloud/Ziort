'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Percent, Plus, Star, CheckCircle2, XCircle,
  Loader2, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useSchemes, useZiPawnSub } from '../hooks/use-zipawn'

export default function SchemeListPage() {
  const { sub } = useZiPawnSub()
  const { data: schemes = [], isLoading } = useSchemes()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-zi-white flex items-center gap-2">
            <Percent size={20} className="text-zi-cyan" /> Loan Schemes
          </h1>
          {sub && <p className="text-zi-muted text-xs mt-0.5 font-mono">{sub.ref_code}</p>}
        </div>
        <button className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={14} /> Add Scheme
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="zi-card p-4 animate-pulse space-y-2">
                <div className="h-4 bg-white/10 rounded w-32" />
                <div className="h-3 bg-white/5 rounded w-48" />
              </div>
            ))}
          </motion.div>
        ) : schemes.length === 0 ? (
          <motion.div key="empty" className="zi-card text-center py-16">
            <Percent size={32} className="text-zi-muted mx-auto mb-3" />
            <p className="text-zi-white font-medium">No schemes configured</p>
            <p className="text-zi-muted text-sm mt-1">
              Add a loan scheme to define interest rates and LTV ratios.
            </p>
          </motion.div>
        ) : (
          <motion.div key="list" className="space-y-2">
            {schemes.map((s: any, i: number) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="zi-card overflow-hidden">
                <button className="w-full flex items-center gap-4 p-4 text-left"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <div className="w-9 h-9 rounded-lg bg-zi-blue/10 border border-zi-blue/20
                                  flex items-center justify-center shrink-0">
                    <Percent size={14} className="text-zi-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-zi-white font-medium">{s.scheme_name}</p>
                      {s.is_default && (
                        <span className="flex items-center gap-0.5 text-zi-gold text-xs">
                          <Star size={10} /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-zi-muted text-xs mt-0.5 font-mono">{s.scheme_code}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-zi-muted text-xs">Rate / month</p>
                      <p className="text-zi-cyan font-display font-bold">
                        {parseFloat(s.interest_rate_pm).toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-zi-muted text-xs">Max LTV</p>
                      <p className="text-zi-white font-medium">{s.max_ltv_pct ?? '—'}%</p>
                    </div>
                    {s.is_active
                      ? <CheckCircle2 size={15} className="text-green-400" />
                      : <XCircle size={15} className="text-zi-muted" />
                    }
                    {expanded === s.id
                      ? <ChevronUp size={14} className="text-zi-muted" />
                      : <ChevronDown size={14} className="text-zi-muted" />
                    }
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === s.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-4 pt-0 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SchemeField label="Interest Rate" value={`${parseFloat(s.interest_rate_pm).toFixed(2)}% / month`} />
                        <SchemeField label="Interest Basis" value={s.interest_basis?.replace('_', ' ')} />
                        <SchemeField label="Max LTV" value={s.max_ltv_pct ? `${s.max_ltv_pct}%` : '—'} />
                        <SchemeField label="Penalty Rate" value={s.penalty_rate_pm ? `${parseFloat(s.penalty_rate_pm).toFixed(2)}% / month` : '—'} />
                        <SchemeField label="Grace Days" value={s.penalty_grace_days ? `${s.penalty_grace_days} days` : 'None'} />
                        <SchemeField label="Min Tenure" value={s.min_tenure_days ? `${s.min_tenure_days} days` : '—'} />
                        <SchemeField label="Max Tenure" value={s.max_tenure_days ? `${s.max_tenure_days} days` : '—'} />
                        <SchemeField label="Processing Fee" value={s.processing_fee_pct ? `${s.processing_fee_pct}%` : 'None'} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SchemeField({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-zi-muted text-xs mt-3">{label}</p>
      <p className="text-zi-white text-sm font-medium mt-0.5">{value ?? '—'}</p>
    </div>
  )
}
