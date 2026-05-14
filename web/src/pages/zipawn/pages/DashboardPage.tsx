import { AlertTriangle, TrendingUp, CreditCard, Users, Clock } from 'lucide-react'
import { useDashboard } from '../hooks/useZiPawn'

interface Props { entityId: string; subscriptionId: string }

export default function DashboardPage({ entityId, subscriptionId }: Props) {
  const { data, isLoading } = useDashboard(entityId, subscriptionId)

  if (isLoading) return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-orbit-deep border border-white/5" />
      ))}
    </div>
  )

  const kpis = [
    { label: 'Active Loans',   value: data?.active_loans ?? 0,    icon: CreditCard,      color: 'text-zi-blue',  bg: 'bg-zi-blue/10'  },
    { label: 'Overdue',        value: data?.overdue_loans ?? 0,   icon: AlertTriangle,   color: 'text-red-400',  bg: 'bg-red-500/10'  },
    { label: 'Customers',      value: data?.total_customers ?? 0, icon: Users,           color: 'text-zi-cyan',  bg: 'bg-zi-cyan/10'  },
    { label: 'Due Today',      value: data?.due_today ?? 0,       icon: Clock,           color: 'text-zi-gold',  bg: 'bg-zi-gold/10'  },
  ]

  const portfolioValue = data?.portfolio_paise ? (data.portfolio_paise / 100) : 0
  const collectedToday = data?.collected_today_paise ? (data.collected_today_paise / 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="p-5 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors">
              <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={k.color} />
              </div>
              <p className="text-2xl font-bold text-zi-white tabular-nums">{k.value.toLocaleString('en-IN')}</p>
              <p className="text-xs text-zi-muted mt-0.5">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Portfolio + Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-orbit-deep border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-zi-blue" />
            <p className="text-xs font-medium text-zi-muted uppercase tracking-widest">Portfolio Value</p>
          </div>
          <p className="text-3xl font-bold text-zi-white tabular-nums">
            ₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-zi-muted mt-1">Outstanding principal across all active loans</p>
        </div>

        <div className="p-5 rounded-xl bg-orbit-deep border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-green-400" />
            <p className="text-xs font-medium text-zi-muted uppercase tracking-widest">Collected Today</p>
          </div>
          <p className="text-3xl font-bold text-green-400 tabular-nums">
            ₹{collectedToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-zi-muted mt-1">Payments received today</p>
        </div>
      </div>

      {/* Overdue loans preview */}
      {data?.overdue_preview?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted mb-3">Overdue Loans</p>
          <div className="space-y-2">
            {data.overdue_preview.slice(0, 5).map((loan: any) => (
              <div key={loan.id}
                className="flex items-center justify-between p-4 rounded-xl bg-orbit-deep border border-red-500/10 hover:border-red-500/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zi-white">{loan.zpn_customers?.full_name}</p>
                  <p className="text-xs text-zi-muted">{loan.zi_code} · Due {loan.maturity_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-400 tabular-nums">
                    ₹{((loan.outstanding_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-red-400/70">outstanding</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
