import { useState } from 'react'
import { Wrench, Plus, X, Check } from 'lucide-react'
import { useVehicles, useAllMaintenance, useAddVehicleMaintenance } from '../hooks/useZiFleet'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const MAINT_TYPES = ['SERVICE','REPAIR','TYRE_CHANGE','OIL_CHANGE','BATTERY','BRAKE','INSPECTION','OTHER']

const EMPTY = {
  vehicle_id: '', maintenance_type: 'SERVICE', description: '',
  cost_str: '', vendor: '', date: '', odometer: '', next_due_date: '', notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.vehicle_id)   e.vehicle_id   = 'Vehicle is required'
  if (!f.description.trim()) e.description = 'Description is required'
  if (f.cost_str && parseFloat(f.cost_str) < 0) e.cost_str = 'Invalid amount'
  return e
}

export default function MaintenancePage({ entityId, subscriptionId }: Props) {
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]   = useState<F>({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: vehiclesData } = useVehicles(entityId, subscriptionId, { limit: 100 })
  const { data: maintData }    = useAllMaintenance(entityId, subscriptionId, {
    vehicle_id: vehicleFilter || undefined, limit: 100,
  })
  const addMaint = useAddVehicleMaintenance(entityId, subscriptionId)

  const vehicles = vehiclesData?.data ?? []
  const records  = maintData?.data    ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function openAdd() {
    setForm({ ...EMPTY })
    setErrors({})
    setShowModal(true)
  }

  async function save() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await addMaint.mutateAsync({
        vehicleId: form.vehicle_id,
        body: {
          maintenance_type: form.maintenance_type,
          description:      form.description.trim(),
          cost_paise:       form.cost_str ? Math.round(parseFloat(form.cost_str) * 100) : undefined,
          vendor:           form.vendor       || undefined,
          date:             form.date         || undefined,
          odometer:         form.odometer ? parseInt(form.odometer) : undefined,
          next_due_date:    form.next_due_date || undefined,
          notes:            form.notes         || undefined,
        },
      })
      toast.success('Maintenance logged')
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors`

  const typeColor: Record<string, string> = {
    SERVICE:     'text-blue-400 bg-blue-400/10',
    REPAIR:      'text-red-400 bg-red-400/10',
    TYRE_CHANGE: 'text-yellow-400 bg-yellow-400/10',
    OIL_CHANGE:  'text-green-400 bg-green-400/10',
    INSPECTION:  'text-purple-400 bg-purple-400/10',
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Maintenance</h1>
          <p className="text-xs text-zi-muted">{maintData?.meta?.total ?? 0} records</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Log Maintenance
        </button>
      </div>

      {/* Vehicle filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setVehicleFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!vehicleFilter ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
          All Vehicles
        </button>
        {vehicles.map((v: any) => (
          <button key={v.id} onClick={() => setVehicleFilter(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${vehicleFilter === v.id ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {v.reg_number}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Wrench size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No maintenance records found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-orbit-deep border-b border-white/5">
                {['Vehicle','Type','Description','Cost','Vendor','Date','Next Due'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const isNextSoon = r.next_due_date && new Date(r.next_due_date) < new Date(Date.now() + 14 * 86400000)
                return (
                  <tr key={r.id} className="border-b border-white/3">
                    <td className="px-4 py-3 font-mono text-xs text-orange-400">{r.zft_vehicles?.reg_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${typeColor[r.maintenance_type] ?? 'text-zi-muted bg-zi-muted/10'}`}>
                        {r.maintenance_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zi-white max-w-[180px] truncate">{r.description}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zi-white">{r.cost_paise ? `₹${(r.cost_paise/100).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{r.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${isNextSoon ? 'text-red-400' : 'text-zi-muted'}`}>
                      {r.next_due_date ? format(new Date(r.next_due_date), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">Log Maintenance</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Vehicle *" err={errors.vehicle_id}>
                  <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} className={ic(!!errors.vehicle_id)}>
                    <option value="">Select…</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </Fld>
                <Fld label="Type">
                  <select value={form.maintenance_type} onChange={e => set('maintenance_type', e.target.value)} className={ic()}>
                    {MAINT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </Fld>
                <div className="col-span-2">
                  <Fld label="Description *" err={errors.description}>
                    <input value={form.description} onChange={e => set('description', e.target.value)} className={ic(!!errors.description)} />
                  </Fld>
                </div>
                <Fld label="Cost (₹)" err={errors.cost_str}>
                  <input type="number" step="1" value={form.cost_str} onChange={e => set('cost_str', e.target.value)} className={ic(!!errors.cost_str)} />
                </Fld>
                <Fld label="Vendor / Garage">
                  <input value={form.vendor} onChange={e => set('vendor', e.target.value)} className={ic()} />
                </Fld>
                <Fld label="Service Date">
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic()} />
                </Fld>
                <Fld label="Odometer (km)">
                  <input type="number" value={form.odometer} onChange={e => set('odometer', e.target.value)} className={ic()} />
                </Fld>
                <div className="col-span-2">
                  <Fld label="Next Due Date">
                    <input type="date" value={form.next_due_date} onChange={e => set('next_due_date', e.target.value)} className={ic()} />
                  </Fld>
                </div>
                <div className="col-span-2">
                  <Fld label="Notes">
                    <input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic()} />
                  </Fld>
                </div>
              </div>
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

function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}{err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}</div>
}
