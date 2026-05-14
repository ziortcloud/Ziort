'use client'
import { use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useZiPawnSub } from '@/zipawn/hooks/use-zipawn'
import { fmtPaise, fmtDate } from '@/zipawn/lib/fmt'

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>
}) {
  const { ticketId } = use(params)
  const { entityId, subscriptionId, ready } = useZiPawnSub()

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['zpn-ticket', ticketId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/entities/${entityId}/zipawn/${subscriptionId}/tickets/${ticketId}`
      )
      if (!res.ok) throw new Error('Ticket not found')
      const j = await res.json()
      return j.data
    },
    enabled: ready && !!ticketId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-zi-muted" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="zi-card text-center py-16">
        <p className="text-zi-muted">Ticket not found</p>
        <Link href="/zipawn/loans" className="btn-secondary text-sm mt-4">Back to Loans</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/zipawn/loans"
          className="p-1.5 rounded-lg border border-white/10 text-zi-muted
                     hover:text-zi-white hover:border-white/20 transition-all">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-zi-white">
            Ticket {ticket.zi_code}
          </h1>
          <p className="text-zi-muted text-xs font-mono">{ticket.ref_code}</p>
        </div>
        <span className={`ml-auto px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize
                          ${ticket.status === 'disbursed'
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : ticket.status === 'draft'
                            ? 'text-zi-muted bg-white/5 border-white/10'
                            : 'text-zi-gold bg-yellow-500/10 border-yellow-500/20'
                          }`}>
          {ticket.status}
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="zi-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoField label="Customer"     value={ticket.zpn_customers?.full_name ?? '—'} />
          <InfoField label="Branch"       value={ticket.zi_branches?.branch_name ?? '—'} />
          <InfoField label="Items"        value={String(ticket.item_count ?? 0)} />
          <InfoField label="Appraised"    value={fmtPaise(ticket.total_appraised_paise ?? 0)} />
          <InfoField label="Sanctioned"   value={ticket.sanctioned_paise ? fmtPaise(ticket.sanctioned_paise) : '—'} />
          <InfoField label="Disbursed At" value={fmtDate(ticket.disbursed_at)} />
          <InfoField label="Created"      value={fmtDate(ticket.created_at)} />
        </div>
      </motion.div>

      {ticket.loan_id && (
        <Link href={`/zipawn/loans/${ticket.loan_id}`} className="btn-primary text-sm">
          View Loan →
        </Link>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zi-muted text-xs">{label}</p>
      <p className="text-zi-white mt-0.5">{value}</p>
    </div>
  )
}
