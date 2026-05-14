import { useState } from 'react'
import { Truck, Plus, X, Check, AlertCircle } from 'lucide-react'
import { useVehicles, useCreateVehicle, useUpdateVehicle } from '../hooks/useZiFleet'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const TYPES  = ['LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER']
const STATUS = ['AVAILABLE','MAINTENANCE','OFF_ROAD']

const EMPTY = {
  reg_number: '', vehicle_type: 'LCV', make: '', model: '', manufacture_year: '',
  capacity_tons: '', insurance_expiry: '', fitness_expiry: '', permit_expiry: '', puc_expiry: '',
  notes: '',
}

type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string,string> = {}
  if (!f.reg_number.trim()) e.reg_number = 'Registration number is required'
  if (!f.make.trim())       e.make       = 'Make is required'
  if (f.manufacture_year && (parseInt(f.manufacture_year) < 1980 || parseInt(f.manufacture_year) > new Date().getFullYear() + 1))
    e.manufacture_year = 'Invalid year'
  return e
}

export default function VehiclesPage({ entityId, subscriptionId }: Props) {
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [form, setForm]                 = useState<F>({ ...EMPTY })
  const [errors, setErrors]             = useState<Record<string,string>>({})
  const [saving, setSaving]             = useState(false)

  const { data }   = useVehicles(entityId, subscriptionId, { status: statusFilter || undefined, limit: 100 })
  const createMut  = useCreateVehicle(entityId, subscriptionId)
  const updateMut  = useUpdateVehicle(entityId, subscriptionId)

  const vehicles = data?.data ?? []

  function openAdd()  { setEditing(null); setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }
  function openEdit(v: any) {
    setEditing(v)
    setForm({
      reg_number: v.reg_number ?? '', vehicle_type: v.vehicle_type ?? 'LCV',
      make: v.make ?? '', model: v.model ?? '', manufacture_year: v.manufacture_year ? String(v.manufacture_year) : '',
      capacity_tons: v.capacity_tons ? String(v.capacity_tons) : '',
      insurance_expiry: v.insurance_expiry ?? '', fitness_expiry: v.fitness_expiry ?? '',
      permit_expiry: v.permit_expiry ?? '', puc_expiry: v.puc_expiry ?? '',
      notes: v.notes ?? '',
    })
    setErrors({})
    setShowModal(true)
  }

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        manufacture_year: form.manufacture_year ? parseInt(form.manufacture_year) : undefined,
        capacity_tons:    form.capacity_tons    ? parseFloat(form.capacity_tons)   : undefined,
        insurance_expiry: form.insurance_expiry || undefined,
        fitness_expiry:   form.fitness_expiry   || undefined,
        permit_expiry:    form.permit_expiry    || undefined,
        puc_expiry:       form.puc_expiry       || undefined,
      }
      if (editing) {
        await updateMut.mutateAsync({ vehicleId: editing.id, body: payload })
        toast.success('Vehicle updated')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Vehicle added')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function updateStatus(vehicleId: string, status: string) {
    try {
      await updateMut.mutateAsync({ vehicleId, body: { status } })
      toast.success('Status updated')
    } catch { toast.error('Update failed') }
  }

  const ic = (err: boolean) => `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors`

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Vehicles</h1>
          <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} vehicles registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'AVAILABLE','ON_TRIP','MAINTENANCE','OFF_ROAD'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {vehicles.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Truck size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No vehicles found. Add your first vehicle to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v: any) => (
            <VehicleCard key={v.id} vehicle={v} onEdit={() => openEdit(v)} onStatus={s => updateStatus(v.id, s)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Row2>
                <Fld label="Reg Number *" err={errors.reg_number}><input value={form.reg_number} onChange={e => set('reg_number', e.target.value.toUpperCase())} placeholder="MH01AB1234" className={ic(!!errors.reg_number)} /></Fld>
                <Fld label="Type"><select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} className={ic(false)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></Fld>
              </Row2>
              <Row2>
                <Fld label="Make *" err={errors.make}><input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Tata, Ashok Leyland…" className={ic(!!errors.make)} /></Fld>
                <Fld label="Model"><input value={form.model} onChange={e => set('model', e.target.value)} className={ic(false)} /></Fld>
              </Row2>
              <Row2>
                <Fld label="Year"><input type="number" value={form.manufacture_year} onChange={e => set('manufacture_year', e.target.value)} placeholder="2020" className={ic(!!errors.manufacture_year)} /></Fld>
                <Fld label="Capacity (tons)"><input type="number" step="0.1" value={form.capacity_tons} onChange={e => set('capacity_tons', e.target.value)} className={ic(false)} /></Fld>
              </Row2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted">Expiry Dates</p>
              <Row2>
                <Fld label="Insurance"><input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} className={ic(false)} /></Fld>
                <Fld label="Fitness"><input type="date" value={form.fitness_expiry} onChange={e => set('fitness_expiry', e.target.value)} className={ic(false)} /></Fld>
              </Row2>
              <Row2>
                <Fld label="Permit"><input type="date" value={form.permit_expiry} onChange={e => set('permit_expiry', e.target.value)} className={ic(false)} /></Fld>
                <Fld label="PUC"><input type="date" value={form.puc_expiry} onChange={e => set('puc_expiry', e.target.value)} className={ic(false)} /></Fld>
              </Row2>
              <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic(false)} /></Fld>
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <AlertCircle size={13} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">Please fix errors above</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VehicleCard({ vehicle: v, onEdit, onStatus }: { vehicle: any; onEdit: () => void; onStatus: (s: string) => void }) {
  const statusColor: Record<string,string> = {
    AVAILABLE:   'bg-green-500/15 text-green-400',
    ON_TRIP:     'bg-blue-500/15 text-blue-400',
    MAINTENANCE: 'bg-yellow-500/15 text-yellow-400',
    OFF_ROAD:    'bg-red-500/15 text-red-400',
  }
  const isExpiring = (d: string): boolean => !!(d && new Date(d) < new Date(Date.now() + 30 * 86400000))

  return (
    <div className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-zi-white font-mono">{v.reg_number}</p>
          <p className="text-xs text-zi-muted">{v.vehicle_type} · {v.make} {v.model}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${statusColor[v.status] ?? statusColor.OFF_ROAD}`}>{v.status?.replace('_',' ')}</span>
      </div>
      {v.capacity_tons && <p className="text-xs text-zi-muted">{v.capacity_tons}T capacity</p>}
      {(v.insurance_expiry || v.fitness_expiry) && (
        <div className="space-y-1">
          {v.insurance_expiry && <ExpiryRow label="Insurance" date={v.insurance_expiry} warn={isExpiring(v.insurance_expiry)} />}
          {v.fitness_expiry   && <ExpiryRow label="Fitness"   date={v.fitness_expiry}   warn={isExpiring(v.fitness_expiry)}   />}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onEdit} className="flex-1 py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">Edit</button>
        {v.status === 'AVAILABLE' && (
          <button onClick={() => onStatus('MAINTENANCE')} className="flex-1 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 hover:bg-yellow-500/20 transition-colors">Maintenance</button>
        )}
        {v.status === 'MAINTENANCE' && (
          <button onClick={() => onStatus('AVAILABLE')} className="flex-1 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/20 transition-colors">Mark Available</button>
        )}
      </div>
    </div>
  )
}

function ExpiryRow({ label, date, warn }: { label: string; date: string; warn: boolean }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-zi-muted">{label}</span>
      <span className={warn ? 'text-red-400 font-semibold' : 'text-zi-muted'}>{format(new Date(date), 'dd MMM yyyy')}</span>
    </div>
  )
}
function Row2({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-3">{children}</div> }
function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}{err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}</div>
}
