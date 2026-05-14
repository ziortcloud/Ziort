import { useState } from 'react'
import { Package, Search, X, Check } from 'lucide-react'
import { useLoads, usePlaceBid, useLoadBids } from '../hooks/useZiLoad'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

export default function LoadBoardPage({ entityId, subscriptionId }: Props) {
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
  const [dest,   setDest]   = useState('')
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidNote,   setBidNote]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useLoads(entityId, subscriptionId, {
    status: 'OPEN', search: search || undefined,
    origin: origin || undefined, destination: dest || undefined,
    limit: 50,
  })
  const placeBid = usePlaceBid(entityId, subscriptionId)
  const { data: bidsData } = useLoadBids(entityId, subscriptionId, selectedLoad?.id ?? '')

  const loads = data?.data ?? []
  const bids  = bidsData ?? []

  async function submitBid() {
    if (!bidAmount || !selectedLoad) return
    setSubmitting(true)
    try {
      await placeBid.mutateAsync({ loadId: selectedLoad.id, body: {
        bid_paise: Math.round(parseFloat(bidAmount) * 100),
        note: bidNote || undefined,
      }})
      toast.success('Bid placed!')
      setBidAmount(''); setBidNote(''); setSelectedLoad(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Bid failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Load Board</h1>
        <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} open loads</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search loads…"
            className="w-full pl-9 pr-4 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/50 focus:outline-none focus:border-green-400/30 transition-colors" />
        </div>
        <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="From city…"
          className="px-4 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/50 focus:outline-none focus:border-green-400/30 transition-colors" />
        <input value={dest} onChange={e => setDest(e.target.value)} placeholder="To city…"
          className="px-4 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/50 focus:outline-none focus:border-green-400/30 transition-colors" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : loads.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Package size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No open loads found. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load: any) => (
            <div key={load.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-green-400">{load.zi_code}</span>
                    {load.cargo_type && <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-zi-muted">{load.cargo_type}</span>}
                    {load.urgency === 'HIGH' && <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded text-[10px] font-semibold">URGENT</span>}
                  </div>
                  <p className="text-sm font-semibold text-zi-white">{load.origin} → {load.destination}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-zi-muted">
                    {load.weight_tons && <span>{load.weight_tons}T</span>}
                    {load.vehicle_type && <span>{load.vehicle_type}</span>}
                    {load.pickup_date && <span>Pickup: {format(new Date(load.pickup_date), 'dd MMM')}</span>}
                    {load.bids_count > 0 && <span>{load.bids_count} bids</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-zi-white tabular-nums">₹{((load.budget_paise || 0)/100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <button onClick={() => { setSelectedLoad(load); setBidAmount(''); setBidNote('') }}
                    className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-500/90 rounded-lg text-xs font-medium text-white transition-colors">
                    Bid Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bid Modal */}
      {selectedLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-zi-white">Place Bid</h2>
                <p className="text-xs text-zi-muted">{selectedLoad.origin} → {selectedLoad.destination}</p>
              </div>
              <button onClick={() => setSelectedLoad(null)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-white/3 rounded-lg text-xs text-zi-muted">
                Budget: <span className="text-zi-white font-semibold">₹{((selectedLoad.budget_paise || 0)/100).toLocaleString('en-IN')}</span>
                {selectedLoad.weight_tons && <> · {selectedLoad.weight_tons}T</>}
                {selectedLoad.cargo_type  && <> · {selectedLoad.cargo_type}</>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Your Bid Amount (₹) *</label>
                <input type="number" step="1" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Note (optional)</label>
                <textarea value={bidNote} onChange={e => setBidNote(e.target.value)} rows={2}
                  placeholder="Truck details, availability…"
                  className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors resize-none" />
              </div>
              {bids.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60 mb-2">Other Bids</p>
                  <div className="space-y-1">
                    {bids.slice(0, 3).map((b: any) => (
                      <div key={b.id} className="flex justify-between text-xs">
                        <span className="text-zi-muted">{b.transporter_name ?? 'Anonymous'}</span>
                        <span className="text-zi-white tabular-nums">₹{((b.bid_paise || 0)/100).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setSelectedLoad(null)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={submitBid} disabled={!bidAmount || submitting}
                className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Submit Bid</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
