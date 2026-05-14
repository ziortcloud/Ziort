import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Route, Plus, Search } from 'lucide-react'
import { useTrips } from '../hooks/useZiFleet'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const STATUSES = ['','CREATED','LOADING','IN_TRANSIT','DELIVERED','CLOSED','CANCELLED']

const STATUS_COLOR: Record<string,string> = {
  CREATED:    'bg-white/5 text-zi-muted border-white/10',
  LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  WAITING:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
  UNLOADING:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  DELIVERED:  'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function TripsPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')

  const { data, isLoading } = useTrips(entityId, subscriptionId, {
    status: statusFilter || undefined,
    search: search || undefined,
    limit: 50,
  })

  const trips = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Trips</h1>
          <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} total trips</p>
        </div>
        <button onClick={() => navigate('/zifleet/trips/new')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> New Trip
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by origin, destination, client, LR…"
          className="w-full pl-9 pr-4 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/50 focus:outline-none focus:border-orange-400/30 transition-colors" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : trips.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Route size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No trips found</p>
          <button onClick={() => navigate('/zifleet/trips/new')} className="px-4 py-2 bg-orange-500 rounded-lg text-sm font-medium text-white">Create First Trip</button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-orbit-deep border-b border-white/5">
                {['Trip ID','Route','Date','Vehicle','Driver','Status','Freight','Balance'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((trip: any) => {
                const freight = (trip.freight_paise || 0) / 100
                const received = (trip.received_paise || 0) / 100
                const balance = freight - received
                return (
                  <tr key={trip.id} onClick={() => navigate(`/zifleet/trips/${trip.id}`)}
                    className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-orange-400">{trip.zi_code}</td>
                    <td className="px-4 py-3 text-zi-white">
                      <p className="font-medium">{trip.origin}</p>
                      <p className="text-xs text-zi-muted">→ {trip.destination}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{trip.created_at ? format(new Date(trip.created_at), 'dd MMM') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{trip.zft_vehicles?.reg_number ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{trip.zft_drivers?.full_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[trip.status] ?? STATUS_COLOR.CREATED}`}>
                        {trip.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zi-white">₹{freight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 tabular-nums font-semibold ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
