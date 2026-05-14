// Overdue Alerts & Reminders
import { useState } from 'react'
import { AlertTriangle, Send, Phone, MessageCircle, Mail, ChevronDown } from 'lucide-react'
import { useOverdueAlerts, useSendReminder } from '../hooks/useZiPawn'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface Props { entityId: string; subscriptionId: string }

export default function AlertsPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<'days_overdue' | 'amount'>('days_overdue')

  const { data, isLoading, refetch } = useOverdueAlerts(entityId, subscriptionId, { limit: 100 })
  const sendReminder = useSendReminder(entityId, subscriptionId)
  const [sending, setSending] = useState<string | null>(null)

  const loans = (data?.data ?? []).sort((a: any, b: any) => {
    if (sort === 'days_overdue') {
      return (new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime())
    }
    return (b.outstanding_paise || 0) - (a.outstanding_paise || 0)
  })

  async function remind(loanId: string, channel: 'sms' | 'whatsapp' | 'email') {
    setSending(`${loanId}-${channel}`)
    try {
      await sendReminder.mutateAsync({ loanId, channel })
      toast.success(`${channel.toUpperCase()} reminder sent`)
    } catch {
      toast.error('Failed to send reminder')
    } finally {
      setSending(null)
    }
  }

  const totalOutstanding = loans.reduce((s: number, l: any) => s + (l.outstanding_paise || 0), 0) / 100

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Overdue Alerts</h1>
          <p className="text-xs text-zi-muted">
            {loans.length} overdue loan{loans.length !== 1 ? 's' : ''} · ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })} outstanding
          </p>
        </div>
        <div className="relative">
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="pl-3 pr-7 py-2 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white focus:outline-none appearance-none cursor-pointer">
            <option value="days_overdue">Sort: Most Overdue</option>
            <option value="amount">Sort: Highest Amount</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zi-muted pointer-events-none" />
        </div>
      </div>

      {/* Summary banner */}
      {loans.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">{loans.length} loans require immediate attention</p>
            <p className="text-xs text-zi-muted mt-0.5">Send reminders via SMS, WhatsApp, or email directly from each row</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading && [...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-orbit-deep border border-white/5 animate-pulse" />
        ))}

        {!isLoading && loans.map((loan: any) => {
          const daysOverdue = loan.maturity_date
            ? differenceInDays(new Date(), new Date(loan.maturity_date))
            : 0
          const outstanding  = (loan.outstanding_paise || 0) / 100

          return (
            <div key={loan.id} className="p-5 rounded-xl bg-orbit-deep border border-red-500/10 hover:border-red-500/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-zi-cyan cursor-pointer hover:underline"
                      onClick={() => navigate(`/zipawn/loans/${loan.id}`)}>
                      {loan.zi_code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/20">
                      {daysOverdue}d overdue
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zi-white">{loan.zpn_customers?.full_name ?? '—'}</p>
                  <p className="text-xs text-zi-muted mt-0.5">
                    Due {loan.maturity_date ? format(new Date(loan.maturity_date), 'dd MMM yyyy') : '—'}
                    {loan.zpn_customers?.mobile && ` · ${loan.zpn_customers.mobile}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-red-400 tabular-nums">
                    ₹{outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-zi-muted">outstanding</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <span className="text-[11px] text-zi-muted mr-1">Remind via:</span>
                {([['sms', Phone, 'SMS'], ['whatsapp', MessageCircle, 'WhatsApp'], ['email', Mail, 'Email']] as const).map(([ch, Icon, label]) => {
                  const key = `${loan.id}-${ch}`
                  return (
                    <button key={ch} onClick={() => remind(loan.id, ch)}
                      disabled={!!sending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orbit-navy border border-white/8 hover:border-zi-cyan/20 hover:text-zi-cyan rounded-lg text-xs text-zi-muted transition-colors disabled:opacity-50">
                      {sending === key
                        ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        : <Icon size={11} />
                      }
                      {label}
                    </button>
                  )
                })}
                <button onClick={() => navigate(`/zipawn/loans/${loan.id}`)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 border border-emerald-500/25 hover:bg-emerald-600/25 rounded-lg text-xs text-emerald-400 transition-colors">
                  <Send size={11} /> Take Payment
                </button>
              </div>
            </div>
          )
        })}

        {!isLoading && loans.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm font-medium text-zi-white">No overdue loans</p>
            <p className="text-xs text-zi-muted mt-1">All loans are current. Great work!</p>
          </div>
        )}
      </div>
    </div>
  )
}
