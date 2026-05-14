import { useState } from 'react'
import { Calendar, Plus, X, Check } from 'lucide-react'
import { useAvailability, usePostAvailability, useWithdrawAvailability } from '../hooks/useZiDriver'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const VEHICLE_TYPES = ['LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated','Any']

const EMPTY = {
  from_city: '', to_city: '', available_from: '', available_to: '',
  vehicle_type: 'Any', daily_rate_str: '', notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.from_city.trim())    e.from_city    = 'City required'
  if (!f.available_from)      e.available_from = 'Start date required'
  return e
}

export default function AvailabilityPage({ entityId, subscriptionId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState<F>({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data }    = useAvailability(entityId, subscriptionId)
  const postAvail   = usePostAvailability(entityId, subscriptionId)
  const withdrawAvail = useWithdrawAvailability(entityId, subscriptionId)
  const slots = data?.data ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await postAvail.mutateAsync({
        from_city:      form.from_city.trim(),
        to_city:        form.to_city || undefined,
        available_from: form.available_from,
        available_to:   form.available_to   || undefined,
        vehicle_type:   form.vehicle_type !== 'Any' ? form.vehicle_type : undefined,
        daily_rate_paise: form.daily_rate_str ? Math.round(parseFloat(form.daily_rate_str) * 100) : undefined,
        notes:          form.notes || undefined,
      })
      toast.success('Availability posted')
      setShowModal(false)
      setForm({ ...EMPTY })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function withdraw(slotId: string) {
    try {
      await withdrawAvail.mutateAsync({ slotId })
      toast.success('Slot withdrawn')
    } catch { toast.error('Failed') }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors`

  const statusColor: Record<string, string> = {
    OPEN: 'bg-green-500/15 text-green-400', BOOKED: 'bg-blue-500/15 text-blue-400', WITHDRAWN: 'bg-zi-muted/15 text-zi-muted',
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Availability</h1>
          <p className="text-xs text-zi-muted">Post your available dates to get hired</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Post Availability
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Calendar size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No availability slots posted. Let employers know when you're free.</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium text-white">Post Availability</button>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((s: any) => (
            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-orbit-deep border border-white/5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor[s.status] ?? statusColor.OPEN}`}>{s.status}</span>
                  {s.vehicle_type && <span className="text-xs text-zi-muted">{s.vehicle_type}</span>}
                </div>
                <p className="text-sm font-semibold text-zi-white">
                  {s.from_city}{s.to_city ? ` → ${s.to_city}` : ''}
                </p>
                <p className="text-xs text-zi-muted mt-0.5">
                  {s.available_from ? format(new Date(s.available_from), 'dd MMM') : '?'}
                  {s.available_to ? ` – ${format(new Date(s.available_to), 'dd MMM yyyy')}` : ' onwards'}
                </p>
              </div>
              {s.daily_rate_paise && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-purple-400">₹{(s.daily_rate_paise/100).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-zi-muted">per day</p>
                </div>
              )}
              {s.status === 'OPEN' && (
                <button onClick={() => withdraw(s.id)} className="px-3 py-1.5 bg-orbit-navy border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                  Withdraw
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">Post Availability</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="From City *" err={errors.from_city}><input value={form.from_city} onChange={e => set('from_city', e.target.value)} placeholder="Mumbai" className={ic(!!errors.from_city)} /></Fld>
                <Fld label="Preferred To City"><input value={form.to_city} onChange={e => set('to_city', e.target.value)} placeholder="Any" className={ic()} /></Fld>
                <Fld label="Available From *" err={errors.available_from}><input type="date" value={form.available_from} onChange={e => set('available_from', e.target.value)} className={ic(!!errors.available_from)} /></Fld>
                <Fld label="Available Until"><input type="date" value={form.available_to} onChange={e => set('available_to', e.target.value)} className={ic()} /></Fld>
                <Fld label="Vehicle Type">
                  <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} className={ic()}>
                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Daily Rate (₹)"><input type="number" step="1" value={form.daily_rate_str} onChange={e => set('daily_rate_str', e.target.value)} className={ic()} /></Fld>
                <div className="col-span-2">
                  <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic()} /></Fld>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Post</>}
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
