// ZiPawn Reports Hub
import { useState } from 'react'
import { BarChart2, TrendingUp, Users, Package, DollarSign, AlertTriangle, Calendar } from 'lucide-react'
import { useReport } from '../hooks/useZiPawn'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const REPORTS = [
  { id: 'daily',        label: 'Daily Business',     icon: Calendar,      desc: 'Disbursements, collections and closures for a day'    },
  { id: 'outstanding',  label: 'Outstanding',         icon: TrendingUp,    desc: 'All active loans with outstanding amounts'            },
  { id: 'collection',   label: 'Collection',          icon: DollarSign,    desc: 'Payment receipts grouped by period'                   },
  { id: 'gold_holdings',label: 'Gold Holdings',       icon: Package,       desc: 'Metal-wise inventory of pledged items'                },
  { id: 'disbursement', label: 'Disbursement',        icon: BarChart2,     desc: 'Loans sanctioned in a given period'                   },
  { id: 'overdue',      label: 'Overdue / NPA',       icon: AlertTriangle, desc: 'Overdue and NPA loan accounts'                       },
  { id: 'customers',    label: 'Customer Summary',    icon: Users,         desc: 'Customer count, KYC status and loan portfolio'        },
  { id: 'scheme_portfolio', label: 'Scheme Portfolio', icon: BarChart2,    desc: 'Portfolio break-down by loan scheme'                  },
]

export default function ReportsPage({ entityId, subscriptionId }: Props) {
  const [selected, setSelected]     = useState(REPORTS[0].id)
  const [dateFrom, setDateFrom]     = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'))
  const [dateTo, setDateTo]         = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data, isLoading } = useReport(entityId, subscriptionId, selected, {
    date_from: dateFrom, date_to: dateTo,
  })

  const report = REPORTS.find(r => r.id === selected)!
  const rows: any[] = data?.rows ?? []
  const summary: any = data?.summary ?? {}
  const columns: string[] = data?.columns ?? []

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Reports</h1>
        <p className="text-xs text-zi-muted">Business intelligence for your pawn shop</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Report selector */}
        <div className="lg:col-span-1 space-y-1">
          {REPORTS.map(r => {
            const Icon = r.icon
            return (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all
                  ${selected === r.id
                    ? 'bg-zi-blue/15 border border-zi-blue/25 text-zi-white'
                    : 'text-zi-muted hover:bg-orbit-deep hover:text-zi-white border border-transparent'}`}>
                <Icon size={14} className={selected === r.id ? 'text-zi-cyan' : 'text-zi-muted'} />
                <span className="font-medium">{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Report content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header + date filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-zi-white">{report.label}</p>
              <p className="text-xs text-zi-muted">{report.desc}</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-1.5 bg-orbit-deep border border-white/8 rounded-lg text-xs text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
              <span className="text-zi-muted text-xs">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-1.5 bg-orbit-deep border border-white/8 rounded-lg text-xs text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
            </div>
          </div>

          {/* Summary cards */}
          {Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(summary).map(([key, val]: [string, any]) => (
                <div key={key} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
                  <p className="text-[10px] text-zi-muted uppercase tracking-widest mb-1">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-bold text-zi-white tabular-nums">
                    {typeof val === 'number' && key.includes('paise')
                      ? `₹${(val / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                      : String(val)
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          <div className="rounded-xl border border-white/5 overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-zi-blue/30 border-t-zi-blue rounded-full animate-spin" />
              </div>
            ) : columns.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-orbit-deep">
                    {columns.map((c: string) => (
                      <th key={c} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zi-muted whitespace-nowrap">
                        {c.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, i) => (
                    <tr key={i} className="border-b border-white/3 hover:bg-orbit-deep/50 transition-colors">
                      {columns.map((c: string) => {
                        const v = row[c]
                        const isPaise = c.includes('paise')
                        return (
                          <td key={c} className="px-4 py-3 text-xs text-zi-white tabular-nums whitespace-nowrap">
                            {isPaise && typeof v === 'number'
                              ? `₹${(v / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                              : v == null ? '—' : String(v)
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="py-12 text-center text-sm text-zi-muted">
                        No data for selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-zi-muted">Select a report and date range to view data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
