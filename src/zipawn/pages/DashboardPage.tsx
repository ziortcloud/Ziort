'use client'
import Link from 'next/link'
import { useDashboard, type DashboardData } from '@/zipawn/hooks/use-zipawn'
import { fmtPaise, fmtDate } from '@/zipawn/lib/fmt'
import {
  AlertTriangle, TrendingUp, Users, Gem, Calendar,
  Clock, CheckCircle2, RefreshCcw, ArrowRight, Loader2,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCompact(paise: number): string {
  const r = paise / 100
  if (r >= 1_00_00_000) return `₹${(r / 1_00_00_000).toFixed(1)}Cr`
  if (r >= 1_00_000)    return `₹${(r / 1_00_000).toFixed(1)}L`
  if (r >= 1_000)       return `₹${(r / 1_000).toFixed(0)}K`
  return fmtPaise(paise)
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; href?: string
}) {
  const inner = (
    <div className={`relative p-4 rounded-xl border bg-white/[0.03] border-white/8
                     hover:border-white/15 transition-all group overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color} opacity-60`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color.replace('bg-', 'bg-').replace('border-', '')} bg-white/5`}>
          <Icon size={15} className={color.includes('cyan') ? 'text-zi-cyan' :
                                     color.includes('gold') ? 'text-zi-gold' :
                                     color.includes('green') ? 'text-green-400' : 'text-red-400'} />
        </div>
        {href && (
          <ArrowRight size={12} className="text-zi-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="text-2xl font-bold text-zi-white font-display mb-0.5">{value}</div>
      <div className="text-xs text-zi-muted font-medium">{label}</div>
      {sub && <div className="text-xs text-zi-muted/60 mt-0.5">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function RiskSpeedometer({ pct, level }: { pct: number; level: DashboardData['risk']['risk_level'] }) {
  // SVG arc speedometer: 180° half-circle
  const clampedPct = Math.min(100, Math.max(0, pct))
  const cx = 110, cy = 110, r = 80
  const startAngle = 180
  const sweepAngle = 180 * (clampedPct / 100)
  const endAngle   = startAngle + sweepAngle

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcX  = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY  = (deg: number) => cy + r * Math.sin(toRad(deg))

  const COLORS = { low: '#22c55e', medium: '#f5a623', high: '#f97316', critical: '#ef4444' }
  const needleColor = COLORS[level]

  const d = clampedPct > 0
    ? `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${sweepAngle > 180 ? 1 : 0} 1 ${arcX(endAngle)} ${arcY(endAngle)}`
    : ''

  // Needle angle: starts left (180°) sweeps right (360°)
  const needleAngle = 180 + 180 * (clampedPct / 100)
  const nx = cx + (r - 10) * Math.cos(toRad(needleAngle))
  const ny = cy + (r - 10) * Math.sin(toRad(needleAngle))

  const labels = [
    { label: 'Safe',     angle: 195 },
    { label: 'Watch',    angle: 240 },
    { label: 'Risk',     angle: 285 },
    { label: 'Critical', angle: 330 },
  ]

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* Track */}
        <path
          d={`M ${arcX(180)} ${arcY(180)} A ${r} ${r} 0 0 1 ${arcX(360)} ${arcY(360)}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round"
        />
        {/* Coloured zones */}
        {[
          { from: 180, to: 225, c: '#22c55e' },
          { from: 225, to: 270, c: '#f5a623' },
          { from: 270, to: 315, c: '#f97316' },
          { from: 315, to: 360, c: '#ef4444' },
        ].map((z, i) => {
          const za = `M ${arcX(z.from)} ${arcY(z.from)} A ${r} ${r} 0 0 1 ${arcX(z.to)} ${arcY(z.to)}`
          return <path key={i} d={za} fill="none" stroke={z.c} strokeWidth="4" strokeLinecap="butt" opacity="0.25" />
        })}
        {/* Active fill */}
        {d && (
          <path d={d} fill="none" stroke={needleColor} strokeWidth="10"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${needleColor}88)` }} />
        )}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={needleColor} strokeWidth="2" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${needleColor})` }} />
        <circle cx={cx} cy={cy} r={4} fill={needleColor} />
        {/* Zone labels */}
        {labels.map(({ label, angle }) => (
          <text key={label}
            x={cx + (r + 16) * Math.cos(toRad(angle))}
            y={cy + (r + 16) * Math.sin(toRad(angle))}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
            {label}
          </text>
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 18} textAnchor="middle" fill={needleColor}
          fontSize="22" fontWeight="bold" fontFamily="monospace">
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy - 2} textAnchor="middle"
          fill="rgba(255,255,255,0.45)" fontSize="10">
          Risk Portfolio
        </text>
      </svg>
      <div className="flex items-center gap-1.5 -mt-1">
        <div className="w-2 h-2 rounded-full" style={{ background: needleColor }} />
        <span className="text-xs font-semibold capitalize" style={{ color: needleColor }}>
          {level} Risk
        </span>
      </div>
    </div>
  )
}

function BarChart({ data }: { data: DashboardData['chart'] }) {
  const maxLoans = Math.max(1, ...data.map(d => d.loans))
  const maxAmount = Math.max(1, ...data.map(d => d.amount))

  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d, i) => {
        const monthLabel = MONTH_NAMES[parseInt(d.month.split('-')[1]) - 1]
        const barH = Math.max(2, (d.loans / maxLoans) * 110)
        const isLast = i === data.length - 1
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex justify-center">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center
                              bg-orbit-deep border border-white/10 rounded-lg px-2.5 py-1.5 text-xs
                              whitespace-nowrap z-10 shadow-xl pointer-events-none">
                <span className="text-zi-white font-semibold">{d.loans} loans</span>
                <span className="text-zi-muted">{fmtCompact(d.amount)}</span>
              </div>
              <div
                className={`w-full rounded-t-sm transition-all duration-300
                            ${isLast ? 'bg-zi-cyan/70' : 'bg-zi-blue/50 group-hover:bg-zi-blue/70'}`}
                style={{
                  height: barH,
                  boxShadow: isLast ? '0 0 8px rgba(0,212,255,0.4)' : undefined,
                }}
              />
            </div>
            <span className="text-[10px] text-zi-muted">{monthLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

function OverdueRow({ loan, idx }: { loan: DashboardData['overdue_list'][0]; idx: number }) {
  const urgency = loan.days_overdue > 30 ? 'text-red-400' :
                  loan.days_overdue > 7  ? 'text-orange-400' : 'text-zi-gold'
  return (
    <Link href={`/zipawn/loans/${loan.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors
                 border-b border-white/5 last:border-0 group">
      <span className="text-xs text-zi-muted w-5 text-right">{idx + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zi-white truncate">{loan.customer_name}</span>
          <span className="text-xs ref-code">•••{loan.mobile_last4}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs ref-code text-zi-muted">{loan.zi_code}</span>
          <span className="text-xs text-zi-muted">Due {fmtDate(loan.loan_end_date)}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-zi-white">{fmtCompact(loan.outstanding_paise)}</div>
        <div className={`text-xs font-medium ${urgency}`}>{loan.days_overdue}d overdue</div>
      </div>
      <ArrowRight size={12} className="text-zi-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-zi-cyan" />
        <p className="text-sm text-zi-muted">Loading dashboard…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-zi-muted">Failed to load dashboard data</p>
        <button onClick={() => refetch()}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <RefreshCcw size={12} /> Retry
        </button>
      </div>
    )
  }

  const { today, risk, profit, overview, chart, overdue_list } = data

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zi-white font-display">ZiPawn Dashboard</h1>
          <p className="text-xs text-zi-muted mt-0.5">Pawnbroking portfolio at a glance</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-zi-muted hover:text-zi-white
                     border border-white/10 rounded-lg px-3 py-1.5 transition-colors
                     disabled:opacity-40">
          <RefreshCcw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Today's KPIs ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Due Today"
          value={today.due_count}
          sub="loans maturing today"
          icon={Calendar}
          color="bg-red-500/10 border-red-500/30"
          href="/zipawn/loans?overdue=true"
        />
        <KpiCard
          label="Collected Today"
          value={fmtCompact(today.collected)}
          sub="payments received"
          icon={CheckCircle2}
          color="bg-green-500/10 border-green-500/30"
        />
        <KpiCard
          label="New Loans Today"
          value={today.new_loans}
          sub="disbursed today"
          icon={Gem}
          color="bg-blue-500/10 border-blue-500/30"
          href="/zipawn/loans"
        />
        <KpiCard
          label="Upcoming (7d)"
          value={today.upcoming}
          sub="loans due this week"
          icon={Clock}
          color="bg-yellow-500/10 border-yellow-500/30"
        />
      </div>

      {/* ── Risk + Profit row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Panel */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zi-white font-display">Portfolio Risk</h2>
              <p className="text-xs text-zi-muted mt-0.5">
                {risk.overdue_count} overdue / {risk.total_active} active
              </p>
            </div>
            <AlertTriangle size={16} className={
              risk.risk_level === 'critical' ? 'text-red-400' :
              risk.risk_level === 'high'     ? 'text-orange-400' :
              risk.risk_level === 'medium'   ? 'text-zi-gold' : 'text-green-400'
            } />
          </div>
          <RiskSpeedometer pct={risk.risk_pct} level={risk.risk_level} />
        </div>

        {/* Profit Panel */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zi-white font-display">Interest Earned</h2>
              <p className="text-xs text-zi-muted mt-0.5">Across time windows</p>
            </div>
            <TrendingUp size={16} className="text-zi-gold" />
          </div>
          <div className="space-y-3">
            {[
              { label: 'This Week',  value: profit.weekly,  color: 'bg-zi-cyan' },
              { label: 'This Month', value: profit.monthly, color: 'bg-zi-blue' },
              { label: 'This Year',  value: profit.yearly,  color: 'bg-zi-gold' },
            ].map(({ label, value, color }) => {
              const maxVal = Math.max(1, profit.yearly)
              const pct = Math.round((value / maxVal) * 100)
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zi-muted">{label}</span>
                    <span className="font-semibold text-zi-white">{fmtCompact(value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${pct}%`, opacity: 0.8 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-zi-white font-display">
                {overview.total_customers}
              </div>
              <div className="text-xs text-zi-muted flex items-center justify-center gap-1">
                <Users size={10} /> Customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-zi-white font-display">
                {overview.active_loans}
              </div>
              <div className="text-xs text-zi-muted flex items-center justify-center gap-1">
                <Gem size={10} /> Active Loans
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Overdue row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 6-month chart */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zi-white font-display">Loan Volume</h2>
              <p className="text-xs text-zi-muted mt-0.5">New loans per month (6 months)</p>
            </div>
          </div>
          {chart.length > 0 ? (
            <BarChart data={chart} />
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-zi-muted">
              No loan data yet
            </div>
          )}
        </div>

        {/* Overdue list */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-zi-white font-display">Overdue Loans</h2>
              <p className="text-xs text-zi-muted mt-0.5">
                {overview.overdue_loans} total · {fmtCompact(overview.overdue_outstanding)} at risk
              </p>
            </div>
            <Link href="/zipawn/loans?status=overdue"
              className="text-xs text-zi-cyan hover:underline flex items-center gap-1">
              View all <ArrowRight size={10} />
            </Link>
          </div>
          {overdue_list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CheckCircle2 size={24} className="text-green-400" />
              <p className="text-sm text-zi-muted">No overdue loans!</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[260px]">
              {overdue_list.map((loan, i) => (
                <OverdueRow key={loan.id} loan={loan} idx={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
