import { useNavigate } from 'react-router-dom'
import { Package, Truck, BookOpen, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { useLoads, useBookings, useTrucks } from '../hooks/useZiLoad'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const BOOKING_STATUS_COLOR: Record<string, string> = {
  CONFIRMED:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
  DELIVERED:  'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function DashboardPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const { data: openLoads }   = useLoads(entityId, subscriptionId, { status: 'OPEN', limit: 5 })
  const { data: allLoads }    = useLoads(entityId, subscriptionId, { limit: 1 })
  const { data: bookingsData } = useBookings(entityId, subscriptionId, { limit: 5 })
  const { data: trucksData }  = useTrucks(entityId, subscriptionId, { limit: 1 })
  const { data: activeBookings } = useBookings(entityId, subscriptionId, { status: 'IN_TRANSIT', limit: 5 })

  const bookings = bookingsData?.data ?? []
  const live     = activeBookings?.data ?? []

  const kpis = [
    { label: 'Open Loads',    value: openLoads?.meta?.total ?? 0,    sub: 'seeking trucks',         icon: Package, color: 'text-green-400 bg-green-400/10',  link: '/ziload/loads'    },
    { label: 'Total Loads',   value: allLoads?.meta?.total  ?? 0,    sub: 'posted by you',          icon: TrendingUp, color: 'text-blue-400 bg-blue-400/10', link: '/ziload/my-loads' },
    { label: 'Trucks Listed', value: trucksData?.meta?.total ?? 0,   sub: 'on marketplace',         icon: Truck, color: 'text-purple-400 bg-purple-400/10',  link: '/ziload/trucks'   },
    { label: 'Bookings',      value: bookingsData?.meta?.total ?? 0, sub: 'all time',               icon: BookOpen, color: 'text-orange-400 bg-orange-400/10',link: '/ziload/bookings' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">ZiLoad Dashboard</h1>
          <p className="text-xs text-zi-muted">Freight marketplace overview</p>
        </div>
        <button onClick={() => navigate('/ziload/my-loads')}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Post Load
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <button key={k.label} onClick={() => navigate(k.link)}
            className="p-5 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 text-left transition-colors">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-zi-white tabular-nums">{k.value}</p>
            <p className="text-[11px] font-semibold text-zi-muted mt-0.5">{k.label}</p>
            <p className="text-[10px] text-zi-muted/60 mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>

      {live.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zi-muted/60 mb-3">Live Shipments</p>
          <div className="space-y-2">
            {live.map((b: any) => (
              <button key={b.id} onClick={() => navigate(`/ziload/bookings/${b.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-orbit-deep border border-white/5 hover:border-white/10 rounded-xl text-left transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zi-white font-mono">{b.zi_code}</p>
                  <p className="text-xs text-zi-muted">{b.origin} → {b.destination}</p>
                </div>
                <ArrowRight size={14} className="text-zi-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zi-muted/60">Recent Bookings</p>
          <button onClick={() => navigate('/ziload/bookings')} className="text-xs text-green-400 hover:underline">View all</button>
        </div>
        {bookings.length === 0 ? (
          <div className="p-8 rounded-xl bg-orbit-deep border border-white/5 text-center">
            <Package size={32} className="text-zi-muted/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-zi-white mb-1">No bookings yet</p>
            <p className="text-xs text-zi-muted mb-4">Post a load or list a truck to get started</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orbit-deep border-b border-white/5">
                  {['Booking','Route','Status','Freight'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} onClick={() => navigate(`/ziload/bookings/${b.id}`)}
                    className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-green-400">{b.zi_code}</td>
                    <td className="px-4 py-3 text-xs text-zi-white">{b.origin} → {b.destination}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${BOOKING_STATUS_COLOR[b.status] ?? BOOKING_STATUS_COLOR.CONFIRMED}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zi-white">₹{((b.freight_paise || 0)/100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
