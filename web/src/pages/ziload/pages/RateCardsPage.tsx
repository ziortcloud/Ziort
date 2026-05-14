import { useState } from 'react'
import { CreditCard, Plus, X, Check } from 'lucide-react'
import { useRateCards, useCreateRateCard } from '../hooks/useZiLoad'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const RATE_TYPES = ['PER_TON','PER_KM','PER_TRIP','PER_DAY','PER_HOUR']

const EMPTY = {
  name: '', origin: '', destination: '', vehicle_type: '',
  rate_type: 'PER_TON', rate_str: '', min_weight: '', max_weight: '', notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.name.trim())  e.name     = 'Name required'
  if (!f.rate_str)     e.rate_str = 'Rate required'
  return e
}

export default function RateCardsPage({ entityId, subscriptionId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState<F>({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data }      = useRateCards(entityId, subscriptionId)
  const createCard    = useCreateRateCard(entityId, subscriptionId)
  const rateCards     = data?.data ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await createCard.mutateAsync({
        name:         form.name.trim(),
        origin:       form.origin       || undefined,
        destination:  form.destination  || undefined,
        vehicle_type: form.vehicle_type || undefined,
        rate_type:    form.rate_type,
        rate_paise:   Math.round(parseFloat(form.rate_str) * 100),
        min_weight:   form.min_weight   ? parseFloat(form.min_weight) : undefined,
        max_weight:   form.max_weight   ? parseFloat(form.max_weight) : undefined,
        notes:        form.notes        || undefined,
      })
      toast.success('Rate card created')
      setShowModal(false)
      setForm({ ...EMPTY })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors`

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Rate Cards</h1>
          <p className="text-xs text-zi-muted">{rateCards.length} rate cards</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Add Rate Card
        </button>
      </div>

      {rateCards.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <CreditCard size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No rate cards defined. Add standard rates for quick quoting.</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium text-white">Add First Rate</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rateCards.map((rc: any) => (
            <div key={rc.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-2">
              <p className="text-sm font-semibold text-zi-white">{rc.name}</p>
              <p className="text-2xl font-bold text-green-400 tabular-nums">
                ₹{((rc.rate_paise || 0)/100).toLocaleString('en-IN')}
                <span className="text-xs text-zi-muted font-normal ml-1">/{rc.rate_type?.replace('PER_', '')}</span>
              </p>
              {(rc.origin || rc.destination) && (
                <p className="text-xs text-zi-muted">{rc.origin || 'Any'} → {rc.destination || 'Any'}</p>
              )}
              {rc.vehicle_type && <p className="text-xs text-zi-muted">{rc.vehicle_type}</p>}
              {(rc.min_weight || rc.max_weight) && (
                <p className="text-xs text-zi-muted">
                  {rc.min_weight && `Min: ${rc.min_weight}T`}{rc.min_weight && rc.max_weight && ' · '}{rc.max_weight && `Max: ${rc.max_weight}T`}
                </p>
              )}
              {rc.notes && <p className="text-xs text-zi-muted/60 truncate">{rc.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">Add Rate Card</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Fld label="Name *" err={errors.name}><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mumbai to Delhi HCV" className={ic(!!errors.name)} /></Fld>
                </div>
                <Fld label="Rate Type">
                  <select value={form.rate_type} onChange={e => set('rate_type', e.target.value)} className={ic()}>
                    {RATE_TYPES.map(t => <option key={t} value={t}>{t.replace('PER_', 'Per ')}</option>)}
                  </select>
                </Fld>
                <Fld label="Rate (₹) *" err={errors.rate_str}>
                  <input type="number" step="1" value={form.rate_str} onChange={e => set('rate_str', e.target.value)} className={ic(!!errors.rate_str)} />
                </Fld>
                <Fld label="From (optional)"><input value={form.origin} onChange={e => set('origin', e.target.value)} className={ic()} /></Fld>
                <Fld label="To (optional)"><input value={form.destination} onChange={e => set('destination', e.target.value)} className={ic()} /></Fld>
                <Fld label="Vehicle Type"><input value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} placeholder="HCV, Container…" className={ic()} /></Fld>
                <div />
                <Fld label="Min Weight (tons)"><input type="number" step="0.1" value={form.min_weight} onChange={e => set('min_weight', e.target.value)} className={ic()} /></Fld>
                <Fld label="Max Weight (tons)"><input type="number" step="0.1" value={form.max_weight} onChange={e => set('max_weight', e.target.value)} className={ic()} /></Fld>
                <div className="col-span-2">
                  <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic()} /></Fld>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
              </button>
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
