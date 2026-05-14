import { useState } from 'react'
import { Package, Plus, X, Check } from 'lucide-react'
import { useLoads, usePostLoad, useUpdateLoad, useLoadBids, useRespondToBid } from '../hooks/useZiLoad'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const VEHICLE_TYPES = ['Any','LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated']
const CARGO_TYPES   = ['General','Fragile','Hazardous','Perishable','Heavy Machinery','Electronics','Chemicals','Automobile','Raw Material','Other']
const URGENCY_OPTS  = ['NORMAL','HIGH','FLEXIBLE']

const EMPTY = {
  origin: '', destination: '', cargo_type: '', weight_tons: '', vehicle_type: '',
  budget_str: '', pickup_date: '', delivery_date: '', urgency: 'NORMAL', description: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.origin.trim())      e.origin      = 'Origin required'
  if (!f.destination.trim()) e.destination = 'Destination required'
  if (!f.budget_str)         e.budget_str  = 'Budget required'
  return e
}

export default function MyLoadsPage({ entityId, subscriptionId }: Props) {
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any | null>(null)
  const [form, setForm]           = useState<F>({ ...EMPTY })
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)
  const [viewBids, setViewBids]   = useState<any | null>(null)

  const { data } = useLoads(entityId, subscriptionId, { mine: true, status: statusFilter || undefined, limit: 100 })
  const { data: bidsData } = useLoadBids(entityId, subscriptionId, viewBids?.id ?? '')
  const postLoad   = usePostLoad(entityId, subscriptionId)
  const updateLoad = useUpdateLoad(entityId, subscriptionId)
  const respondBid = useRespondToBid(entityId, subscriptionId)

  const loads = data?.data ?? []
  const bids  = bidsData  ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function openAdd()  { setEditing(null); setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }
  function openEdit(l: any) {
    setEditing(l)
    setForm({
      origin: l.origin ?? '', destination: l.destination ?? '',
      cargo_type: l.cargo_type ?? '', weight_tons: l.weight_tons ? String(l.weight_tons) : '',
      vehicle_type: l.vehicle_type ?? '', budget_str: l.budget_paise ? String(l.budget_paise / 100) : '',
      pickup_date: l.pickup_date ?? '', delivery_date: l.delivery_date ?? '',
      urgency: l.urgency ?? 'NORMAL', description: l.description ?? '',
    })
    setErrors({}); setShowModal(true)
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        origin: form.origin.trim(), destination: form.destination.trim(),
        cargo_type: form.cargo_type || undefined, weight_tons: form.weight_tons ? parseFloat(form.weight_tons) : undefined,
        vehicle_type: form.vehicle_type || undefined, budget_paise: Math.round(parseFloat(form.budget_str) * 100),
        pickup_date: form.pickup_date || undefined, delivery_date: form.delivery_date || undefined,
        urgency: form.urgency, description: form.description || undefined,
      }
      if (editing) {
        await updateLoad.mutateAsync({ loadId: editing.id, body: payload })
        toast.success('Load updated')
      } else {
        await postLoad.mutateAsync(payload)
        toast.success('Load posted')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function closeLoad(loadId: string) {
    try {
      await updateLoad.mutateAsync({ loadId, body: { status: 'CLOSED' } })
      toast.success('Load closed')
    } catch { toast.error('Failed') }
  }

  async function acceptBid(bid: any) {
    try {
      await respondBid.mutateAsync({ loadId: viewBids.id, bidId: bid.id, body: { status: 'ACCEPTED' } })
      toast.success('Bid accepted — booking created')
      setViewBids(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed')
    }
  }

  async function rejectBid(bid: any) {
    try {
      await respondBid.mutateAsync({ loadId: viewBids.id, bidId: bid.id, body: { status: 'REJECTED' } })
      toast.success('Bid rejected')
    } catch { toast.error('Failed') }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors`

  const statusColors: Record<string, string> = {
    OPEN: 'bg-green-500/15 text-green-400', CLOSED: 'bg-zi-muted/15 text-zi-muted',
    FILLED: 'bg-blue-500/15 text-blue-400', CANCELLED: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">My Loads</h1>
          <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} loads posted</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Post Load
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['','OPEN','FILLED','CLOSED','CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-green-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loads.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Package size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No loads posted yet</p>
          <button onClick={openAdd} className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium text-white">Post First Load</button>
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load: any) => (
            <div key={load.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-green-400">{load.zi_code}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[load.status] ?? statusColors.OPEN}`}>{load.status}</span>
                    {load.bids_count > 0 && (
                      <button onClick={() => setViewBids(load)} className="px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded text-[10px] font-semibold hover:bg-orange-500/25 transition-colors">
                        {load.bids_count} bids
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zi-white">{load.origin} → {load.destination}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-zi-muted">
                    {load.cargo_type && <span>{load.cargo_type}</span>}
                    {load.weight_tons && <span>{load.weight_tons}T</span>}
                    {load.pickup_date && <span>Pickup: {format(new Date(load.pickup_date), 'dd MMM')}</span>}
                    <span>Budget: ₹{((load.budget_paise || 0)/100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {load.status === 'OPEN' && (
                    <>
                      <button onClick={() => openEdit(load)} className="px-3 py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">Edit</button>
                      <button onClick={() => closeLoad(load.id)} className="px-3 py-1.5 bg-orbit-navy border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">Close</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">{editing ? 'Edit Load' : 'Post Load'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Origin *" err={errors.origin}><input value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Mumbai" className={ic(!!errors.origin)} /></Fld>
                <Fld label="Destination *" err={errors.destination}><input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Delhi" className={ic(!!errors.destination)} /></Fld>
                <Fld label="Budget (₹) *" err={errors.budget_str}><input type="number" step="1" value={form.budget_str} onChange={e => set('budget_str', e.target.value)} className={ic(!!errors.budget_str)} /></Fld>
                <Fld label="Weight (tons)"><input type="number" step="0.1" value={form.weight_tons} onChange={e => set('weight_tons', e.target.value)} className={ic()} /></Fld>
                <Fld label="Cargo Type">
                  <select value={form.cargo_type} onChange={e => set('cargo_type', e.target.value)} className={ic()}>
                    <option value="">Select…</option>
                    {CARGO_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Vehicle Type">
                  <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} className={ic()}>
                    <option value="">Any</option>
                    {VEHICLE_TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Pickup Date"><input type="date" value={form.pickup_date} onChange={e => set('pickup_date', e.target.value)} className={ic()} /></Fld>
                <Fld label="Delivery Date"><input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} className={ic()} /></Fld>
                <Fld label="Urgency">
                  <select value={form.urgency} onChange={e => set('urgency', e.target.value)} className={ic()}>
                    {URGENCY_OPTS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </Fld>
                <div />
              </div>
              <Fld label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors resize-none" /></Fld>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> {editing ? 'Update' : 'Post'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Bids Modal */}
      {viewBids && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-zi-white">Bids for {viewBids.zi_code}</h2>
                <p className="text-xs text-zi-muted">{viewBids.origin} → {viewBids.destination}</p>
              </div>
              <button onClick={() => setViewBids(null)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {bids.length === 0 ? (
                <p className="text-sm text-zi-muted text-center py-4">No bids yet</p>
              ) : bids.map((bid: any) => (
                <div key={bid.id} className="flex items-center justify-between p-3 bg-orbit-navy border border-white/8 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-zi-white">{bid.transporter_name ?? 'Transporter'}</p>
                    {bid.note && <p className="text-xs text-zi-muted mt-0.5">{bid.note}</p>}
                    <p className="text-[10px] text-zi-muted/60 mt-0.5">{bid.created_at ? format(new Date(bid.created_at), 'dd MMM, hh:mm a') : ''}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-lg font-bold text-zi-white">₹{((bid.bid_paise || 0)/100).toLocaleString('en-IN')}</p>
                    {bid.status === 'PENDING' && viewBids.status === 'OPEN' && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => rejectBid(bid)} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 hover:bg-red-500/20 transition-colors">Reject</button>
                        <button onClick={() => acceptBid(bid)} className="px-2 py-0.5 bg-green-500/15 border border-green-500/20 rounded text-[10px] text-green-400 hover:bg-green-500/25 transition-colors">Accept</button>
                      </div>
                    )}
                    {bid.status !== 'PENDING' && (
                      <span className={`text-[10px] font-semibold ${bid.status === 'ACCEPTED' ? 'text-green-400' : 'text-red-400'}`}>{bid.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}{err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}</div>
}
