'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, ChevronRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useZiPawnSub } from '@/zipawn/hooks/use-zipawn'
import { fmtPaise, fmtDate } from '@/zipawn/lib/fmt'

export default function TicketListPage() {
  const { entityId, subscriptionId, sub, ready } = useZiPawnSub()

  const { data, isLoading } = useQuery({
    queryKey: ['zpn-tickets', entityId, subscriptionId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/tickets?limit=50`
      )
      if (!res.ok) throw new Error('Failed to load tickets')
      const j = await res.json()
      return j.data as any[]
    },
    enabled: ready,
  })

  const tickets = data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-zi-white flex items-center gap-2">
            <FileText size={20} className="text-zi-cyan" /> Loan Tickets
          </h1>
          {sub && <p className="text-zi-muted text-xs mt-0.5 font-mono">{sub.ref_code}</p>}
        </div>
        <Link href="/zipawn/tickets/new" className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={14} /> New Ticket
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="zi-card p-4 animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-white/10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-32" />
                  <div className="h-2.5 bg-white/5 rounded w-20" />
                </div>
                <div className="h-5 w-16 bg-white/10 rounded" />
              </div>
            ))}
          </motion.div>
        ) : tickets.length === 0 ? (
          <motion.div key="empty" className="zi-card text-center py-16">
            <FileText size={32} className="text-zi-muted mx-auto mb-3" />
            <p className="text-zi-white font-medium">No tickets yet</p>
            <p className="text-zi-muted text-sm mt-1">Create a ticket to start a new loan</p>
            <Link href="/zipawn/tickets/new" className="btn-primary text-sm mt-4">
              <Plus size={13} className="inline mr-1" /> New Ticket
            </Link>
          </motion.div>
        ) : (
          <motion.div key="list" className="space-y-2">
            {tickets.map((t: any, i: number) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}>
                <Link href={`/zipawn/tickets/${t.id}`}
                  className="zi-card flex items-center gap-4 p-4 hover:border-zi-blue/30
                             hover:bg-orbit-navy/40 transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-zi-blue/10 border border-zi-blue/20
                                  flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-zi-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zi-white font-medium text-sm">{t.zi_code}</p>
                    <p className="text-zi-muted text-xs mt-0.5">
                      {t.zpn_customers?.full_name ?? '—'} · {t.item_count ?? 0} items
                    </p>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-zi-muted text-xs">Appraised</p>
                    <p className="text-zi-white text-sm font-medium">
                      {fmtPaise(t.total_appraised_paise ?? 0)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize shrink-0
                                    ${t.status === 'disbursed'
                                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                      : t.status === 'draft'
                                      ? 'text-zi-muted bg-white/5 border-white/10'
                                      : 'text-zi-gold bg-yellow-500/10 border-yellow-500/20'
                                    }`}>
                    {t.status}
                  </span>
                  <ChevronRight size={14}
                    className="text-zi-muted group-hover:text-zi-white transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
