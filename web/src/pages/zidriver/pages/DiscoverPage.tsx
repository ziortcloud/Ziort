import { useState } from 'react'
import { Users, Search, Star, X, Check } from 'lucide-react'
import { useDiscoverDrivers, useHireDriver } from '../hooks/useZiDriver'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const VEHICLE_TYPES = ['','LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated']

export default function DiscoverPage({ entityId, subscriptionId }: Props) {
  const [fromCity,   setFromCity]   = useState('')
  const [toCity,     setToCity]     = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [searched,   setSearched]   = useState(false)
  const [hireTarget, setHireTarget] = useState<any | null>(null)
  const [hireForm,   setHireForm]   = useState({ start_date: '', end_date: '', daily_rate_str: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const { data, isFetching } = useDiscoverDrivers(entityId, subscriptionId,
    searched ? { from_city: fromCity || undefined, to_city: toCity || undefined, vehicle_type: vehicleType || undefined, limit: 50 } : undefined
  )
  const hireDriver = useHireDriver(entityId, subscriptionId)
  const drivers = data?.data ?? []

  async function hire() {
    if (!hireTarget || !hireForm.start_date) return
    setSubmitting(true)
    try {
      await hireDriver.mutateAsync({
        driver_profile_id: hireTarget.id,
        from_city:         hireForm.notes ? undefined : hireTarget.current_location,
        start_date:        hireForm.start_date,
        end_date:          hireForm.end_date  || undefined,
        offered_rate_paise: hireForm.daily_rate_str ? Math.round(parseFloat(hireForm.daily_rate_str) * 100) : undefined,
        notes:             hireForm.notes || undefined,
      })
      toast.success('Hire request sent!')
      setHireTarget(null)
      setHireForm({ start_date: '', end_date: '', daily_rate_str: '', notes: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Hire request failed')
    } finally { setSubmitting(false) }
  }

  const ic = 'w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors'

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Find Drivers</h1>
        <p className="text-xs text-zi-muted">Discover available drivers in your area</p>
      </div>

      {/* Search filters */}
      <div className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">From City</label>
            <input value={fromCity} onChange={e => setFromCity(e.target.value)} placeholder="Mumbai"
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">To City (optional)</label>
            <input value={toCity} onChange={e => setToCity(e.target.value)} placeholder="Delhi"
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Vehicle Type</label>
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-purple-400/40 transition-colors">
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t || 'Any'}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setSearched(true)}
          className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Search size={14} /> Search Drivers
        </button>
      </div>

      {!searched ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Users size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">Enter a city and search to find available drivers</p>
        </div>
      ) : isFetching ? (
        <div className="grid sm:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : drivers.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Users size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No drivers found matching your criteria</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {drivers.map((d: any) => (
            <div key={d.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-zi-white">{d.full_name}</p>
                  {d.experience && <p className="text-xs text-zi-muted">{d.experience} experience</p>}
                  {d.current_location && <p className="text-xs text-zi-muted">📍 {d.current_location}</p>}
                </div>
                {d.avg_rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <Star size={11} fill="currentColor" /> {d.avg_rating.toFixed(1)}
                  </span>
                )}
              </div>
              {d.vehicle_types?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {d.vehicle_types.map((vt: string) => (
                    <span key={vt} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px]">{vt}</span>
                  ))}
                </div>
              )}
              {d.languages?.length > 0 && (
                <p className="text-xs text-zi-muted">{d.languages.join(', ')}</p>
              )}
              {d.available_from && (
                <p className="text-xs text-green-400">Available from {format(new Date(d.available_from), 'dd MMM')}{d.available_to ? ` – ${format(new Date(d.available_to), 'dd MMM')}` : ''}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                {d.daily_rate_paise ? (
                  <p className="text-sm font-semibold text-zi-white">₹{(d.daily_rate_paise/100).toLocaleString('en-IN')}<span className="text-xs text-zi-muted font-normal">/day</span></p>
                ) : <div />}
                <button onClick={() => { setHireTarget(d); setHireForm({ start_date: '', end_date: '', daily_rate_str: d.daily_rate_paise ? String(d.daily_rate_paise/100) : '', notes: '' }) }}
                  className="px-3 py-1.5 bg-purple-500 hover:bg-purple-500/90 rounded-lg text-xs font-medium text-white transition-colors">
                  Hire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hire Modal */}
      {hireTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-zi-white">Hire {hireTarget.full_name}</h2>
                <p className="text-xs text-zi-muted">Send a hire offer</p>
              </div>
              <button onClick={() => setHireTarget(null)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input type="date" value={hireForm.start_date} onChange={e => setHireForm(p => ({ ...p, start_date: e.target.value }))} className={ic} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">End Date</label>
                  <input type="date" value={hireForm.end_date} onChange={e => setHireForm(p => ({ ...p, end_date: e.target.value }))} className={ic} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Offered Daily Rate (₹)</label>
                  <input type="number" step="1" value={hireForm.daily_rate_str} onChange={e => setHireForm(p => ({ ...p, daily_rate_str: e.target.value }))} className={ic} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea value={hireForm.notes} onChange={e => setHireForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                    className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setHireTarget(null)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={hire} disabled={!hireForm.start_date || submitting}
                className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Send Offer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
