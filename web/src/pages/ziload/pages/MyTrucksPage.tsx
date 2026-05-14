import { useState } from 'react'
import { Truck, Plus, X, Check } from 'lucide-react'
import { useTrucks, usePostTruck, useUpdateTruck } from '../hooks/useZiLoad'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const VEHICLE_TYPES = ['LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated','Other']

const EMPTY = {
  reg_number: '', vehicle_type: 'HCV', make: '', model: '',
  capacity_tons: '', current_location: '', available_from: '', contact_mobile: '', notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.reg_number.trim()) e.reg_number = 'Registration number required'
  if (!f.make.trim())       e.make       = 'Make is required'
  if (f.contact_mobile && !/^\d{10}$/.test(f.contact_mobile.replace(/\s/g, '')))
    e.contact_mobile = '10-digit mobile required'
  return e
}

export default function MyTrucksPage({ entityId, subscriptionId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any | null>(null)
  const [form, setForm]           = useState<F>({ ...EMPTY })
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)

  const { data }   = useTrucks(entityId, subscriptionId, { mine: true, limit: 100 })
  const postTruck  = usePostTruck(entityId, subscriptionId)
  const updateTruck = useUpdateTruck(entityId, subscriptionId)
  const trucks = data?.data ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function openAdd()  { setEditing(null); setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }
  function openEdit(t: any) {
    setEditing(t)
    setForm({
      reg_number: t.reg_number ?? '', vehicle_type: t.vehicle_type ?? 'HCV',
      make: t.make ?? '', model: t.model ?? '',
      capacity_tons: t.capacity_tons ? String(t.capacity_tons) : '',
      current_location: t.current_location ?? '', available_from: t.available_from ?? '',
      contact_mobile: '', notes: t.notes ?? '',
    })
    setErrors({}); setShowModal(true)
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        reg_number:       form.reg_number.trim().toUpperCase(),
        vehicle_type:     form.vehicle_type,
        make:             form.make.trim(),
        model:            form.model || undefined,
        capacity_tons:    form.capacity_tons ? parseFloat(form.capacity_tons) : undefined,
        current_location: form.current_location || undefined,
        available_from:   form.available_from   || undefined,
        notes:            form.notes            || undefined,
      }
      if (!editing && form.contact_mobile) payload.contact_mobile = form.contact_mobile.replace(/\s/g, '')

      if (editing) {
        await updateTruck.mutateAsync({ truckId: editing.id, body: payload })
        toast.success('Truck updated')
      } else {
        await postTruck.mutateAsync(payload)
        toast.success('Truck listed')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function toggleStatus(truck: any) {
    const newStatus = truck.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE'
    try {
      await updateTruck.mutateAsync({ truckId: truck.id, body: { status: newStatus } })
      toast.success(`Marked ${newStatus.toLowerCase()}`)
    } catch { toast.error('Failed') }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors`

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">My Trucks</h1>
          <p className="text-xs text-zi-muted">{trucks.length} trucks listed</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> List Truck
        </button>
      </div>

      {trucks.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Truck size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No trucks listed yet</p>
          <button onClick={openAdd} className="px-4 py-2 bg-green-500 rounded-lg text-sm font-medium text-white">List Your Truck</button>
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t.status === 'AVAILABLE' ? 'bg-green-500/15 text-green-400' : 'bg-zi-muted/15 text-zi-muted'}`}>
                  {t.status}
                </span>
              </div>
              {t.capacity_tons && <p className="text-xs text-zi-muted">{t.capacity_tons}T capacity</p>}
              {t.current_location && <p className="text-xs text-zi-muted">📍 {t.current_location}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(t)} className="flex-1 py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">Edit</button>
                <button onClick={() => toggleStatus(t)} className={`flex-1 py-1.5 rounded-lg text-xs transition-colors border ${t.status === 'AVAILABLE' ? 'bg-zi-muted/10 border-zi-muted/20 text-zi-muted hover:bg-zi-muted/20' : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
                  {t.status === 'AVAILABLE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">{editing ? 'Edit Truck' : 'List Truck'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Reg Number *" err={errors.reg_number}>
                  <input value={form.reg_number} onChange={e => set('reg_number', e.target.value.toUpperCase())} placeholder="MH01AB1234" className={ic(!!errors.reg_number)} />
                </Fld>
                <Fld label="Type">
                  <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} className={ic()}>
                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Make *" err={errors.make}><input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Tata, Ashok Leyland…" className={ic(!!errors.make)} /></Fld>
                <Fld label="Model"><input value={form.model} onChange={e => set('model', e.target.value)} className={ic()} /></Fld>
                <Fld label="Capacity (tons)"><input type="number" step="0.1" value={form.capacity_tons} onChange={e => set('capacity_tons', e.target.value)} className={ic()} /></Fld>
                {!editing && (
                  <Fld label="Contact Mobile" err={errors.contact_mobile}>
                    <input type="tel" value={form.contact_mobile} onChange={e => set('contact_mobile', e.target.value)} maxLength={10} className={ic(!!errors.contact_mobile)} />
                  </Fld>
                )}
                <Fld label="Current Location"><input value={form.current_location} onChange={e => set('current_location', e.target.value)} placeholder="City name" className={ic()} /></Fld>
                <Fld label="Available From City"><input value={form.available_from} onChange={e => set('available_from', e.target.value)} className={ic()} /></Fld>
              </div>
              <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic()} /></Fld>
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
