import { Truck, Search } from 'lucide-react'
import { useState } from 'react'
import { useTrucks } from '../hooks/useZiLoad'

interface Props { entityId: string; subscriptionId: string }

const TRUCK_TYPES = ['','LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated']

export default function TrucksPage({ entityId, subscriptionId }: Props) {
  const [typeFilter, setTypeFilter] = useState('')
  const [origin,     setOrigin]     = useState('')

  const { data, isLoading } = useTrucks(entityId, subscriptionId, {
    vehicle_type: typeFilter || undefined,
    available_from: origin   || undefined,
    limit: 50,
  })
  const trucks = data?.data ?? []

  const statusColor: Record<string, string> = {
    AVAILABLE: 'bg-green-500/15 text-green-400',
    BUSY: 'bg-yellow-500/15 text-yellow-400',
    INACTIVE: 'bg-zi-muted/15 text-zi-muted',
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Truck Board</h1>
        <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} trucks listed</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TRUCK_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-green-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {t || 'All Types'}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
        <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Filter by available city…"
          className="w-full pl-9 pr-4 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/50 focus:outline-none focus:border-green-400/30 transition-colors" />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : trucks.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Truck size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No trucks available matching your criteria.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trucks.map((t: any) => (
            <div key={t.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-zi-white font-mono">{t.reg_number}</p>
                  <p className="text-xs text-zi-muted">{t.vehicle_type} · {t.make} {t.model}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColor[t.status] ?? statusColor.INACTIVE}`}>{t.status}</span>
              </div>
              {t.capacity_tons && <p className="text-xs text-zi-muted">{t.capacity_tons}T capacity</p>}
              {t.current_location && (
                <p className="text-xs text-zi-muted">📍 {t.current_location}</p>
              )}
              {t.available_from && (
                <p className="text-xs text-zi-muted">Available from: <span className="text-zi-white">{t.available_from}</span></p>
              )}
              {t.available_for_routes && t.available_for_routes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.available_for_routes.slice(0, 3).map((r: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px]">{r}</span>
                  ))}
                </div>
              )}
              {t.contact_mobile_last4 && (
                <p className="text-xs text-zi-muted">Contact: ****{t.contact_mobile_last4}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
