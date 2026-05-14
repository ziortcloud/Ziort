import { useNavigate } from 'react-router-dom'
import { Truck, Users, Route, Wrench, Plus, ArrowRight } from 'lucide-react'
import { useVehicles, useDrivers, useTrips } from '../hooks/useZiFleet'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

export default function DashboardPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const { data: vehiclesData } = useVehicles(entityId, subscriptionId, { limit: 100 })
  const { data: driversData }  = useDrivers(entityId, subscriptionId, { limit: 100 })
  const { data: tripsData }    = useTrips(entityId, subscriptionId, { limit: 10 })
  const { data: activeTrips }  = useTrips(entityId, subscriptionId, { status: 'IN_TRANSIT', limit: 5 })

  const vehicles = vehiclesData?.data ?? []
  const drivers  = driversData?.data  ?? []
  const trips    = tripsData?.data    ?? []
  const live     = activeTrips?.data  ?? []

  const availVehicles = vehicles.filter((v: any) => v.status === 'AVAILABLE').length
  const availDrivers  = drivers.filter((d: any) => d.status === 'AVAILABLE').length
  const onTripCount   = vehicles.filter((v: any) => v.status === 'ON_TRIP').length

  const kpis = [
    { label: 'Total Vehicles',   value: vehicles.length,  sub: `${availVehicles} available`,  icon: Truck, color: 'text-orange-400 bg-orange-400/10', link: '/zifleet/vehicles' },
    { label: 'Total Drivers',    value: drivers.length,   sub: `${availDrivers} available`,   icon: Users, color: 'text-blue-400 bg-blue-400/10',   link: '/zifleet/drivers'  },
    { label: 'Vehicles on Trip', value: onTripCount,      sub: 'currently in transit',        icon: Route, color: 'text-green-400 bg-green-400/10', link: '/zifleet/trips'    },
    { label: 'Total Trips',      value: tripsData?.meta?.total ?? 0, sub: 'all time',              icon: Wrench,color: 'text-purple-400 bg-purple-400/10',link: '/zifleet/trips'    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Fleet Dashboard</h1>
          <p className="text-xs text-zi-muted">Overview of your fleet operations</p>
        </div>
        <button onClick={() => navigate('/zifleet/trips/new')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> New Trip
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <button key={k.label} onClick={() => navigate(k.link)}
            className="p-5 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 text-left transition-colors group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-zi-white tabular-nums">{k.value}</p>
            <p className="text-[11px] font-semibold text-zi-muted mt-0.5">{k.label}</p>
            <p className="text-[10px] text-zi-muted/60 mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Live trips */}
      {live.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zi-muted/60 mb-3">Live Trips</p>
          <div className="space-y-2">
            {live.map((trip: any) => (
              <button key={trip.id} onClick={() => navigate(`/zifleet/trips/${trip.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-orbit-deep border border-white/5 hover:border-white/10 rounded-xl text-left transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zi-white font-mono">{trip.zi_code}</p>
                  <p className="text-xs text-zi-muted">{trip.origin} → {trip.destination}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zi-white">{trip.zft_vehicles?.reg_number}</p>
                  <p className="text-[10px] text-zi-muted">{trip.zft_drivers?.full_name}</p>
                </div>
                <ArrowRight size={14} className="text-zi-muted shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zi-muted/60">Recent Trips</p>
          <button onClick={() => navigate('/zifleet/trips')} className="text-xs text-orange-400 hover:underline">View all</button>
        </div>
        {trips.length === 0 ? (
          <div className="p-8 rounded-xl bg-orbit-deep border border-white/5 text-center">
            <Route size={32} className="text-zi-muted/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-zi-white mb-1">No trips yet</p>
            <p className="text-xs text-zi-muted mb-4">Start your first trip to see it here</p>
            <button onClick={() => navigate('/zifleet/trips/new')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
              Create First Trip
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orbit-deep border-b border-white/5">
                  {['Trip ID', 'Route', 'Vehicle', 'Driver', 'Status', 'Freight'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.map((trip: any) => (
                  <tr key={trip.id} onClick={() => navigate(`/zifleet/trips/${trip.id}`)}
                    className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-orange-400">{trip.zi_code}</td>
                    <td className="px-4 py-3 text-zi-white">{trip.origin} → {trip.destination}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{trip.zft_vehicles?.reg_number ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{trip.zft_drivers?.full_name ?? '—'}</td>
                    <td className="px-4 py-3"><TripStatus status={trip.status} /></td>
                    <td className="px-4 py-3 tabular-nums text-zi-white">₹{((trip.freight_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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

function TripStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    CREATED:    'bg-white/5 text-zi-muted border-white/10',
    LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
    DELIVERED:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
    CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
    CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[status] ?? map.CREATED}`}>{status.replace('_', ' ')}</span>
}
