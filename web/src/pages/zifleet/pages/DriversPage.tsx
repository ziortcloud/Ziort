import { useState } from 'react'
import { Users, Plus, X, Check, AlertCircle, Phone, Star } from 'lucide-react'
import { useDrivers, useCreateDriver, useUpdateDriver } from '../hooks/useZiFleet'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const EMPTY = {
  full_name: '', mobile: '', license_no: '', license_expiry: '',
  aadhaar_last4: '', emergency_name: '', emergency_mobile: '', notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string,string> = {}
  if (!f.full_name.trim()) e.full_name = 'Name is required'
  if (!f.mobile) e.mobile = 'Mobile is required'
  else if (!/^\d{10}$/.test(f.mobile.replace(/\s/g,''))) e.mobile = '10-digit mobile required'
  if (f.aadhaar_last4 && !/^\d{4}$/.test(f.aadhaar_last4)) e.aadhaar_last4 = 'Enter last 4 digits of Aadhaar'
  if (f.emergency_mobile && !/^\d{10}$/.test(f.emergency_mobile.replace(/\s/g,''))) e.emergency_mobile = '10-digit mobile required'
  return e
}

export default function DriversPage({ entityId, subscriptionId }: Props) {
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<any | null>(null)
  const [form, setForm]                 = useState<F>({ ...EMPTY })
  const [errors, setErrors]             = useState<Record<string,string>>({})
  const [saving, setSaving]             = useState(false)

  const { data }  = useDrivers(entityId, subscriptionId, { status: statusFilter || undefined, limit: 100 })
  const createMut = useCreateDriver(entityId, subscriptionId)
  const updateMut = useUpdateDriver(entityId, subscriptionId)
  const drivers   = data?.data ?? []

  function openAdd()  { setEditing(null); setForm({ ...EMPTY }); setErrors({}); setShowModal(true) }
  function openEdit(d: any) {
    setEditing(d)
    setForm({
      full_name: d.full_name ?? '', mobile: '', license_no: d.license_no ?? '',
      license_expiry: d.license_expiry ?? '', aadhaar_last4: d.aadhaar_last4 ?? '',
      emergency_name: d.emergency_name ?? '', emergency_mobile: d.emergency_mobile ?? '',
      notes: d.notes ?? '',
    })
    setErrors({}); setShowModal(true)
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
      const payload: Record<string,any> = {
        full_name: form.full_name.trim(), license_no: form.license_no || undefined,
        license_expiry: form.license_expiry || undefined, aadhaar_last4: form.aadhaar_last4 || undefined,
        emergency_name: form.emergency_name || undefined, emergency_mobile: form.emergency_mobile || undefined,
        notes: form.notes || undefined,
      }
      if (!editing) payload.mobile = form.mobile.replace(/\s/g,'')
      if (editing) {
        await updateMut.mutateAsync({ driverId: editing.id, body: payload })
        toast.success('Driver updated')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Driver added')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = (err: boolean) => `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors`

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Drivers</h1>
          <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} drivers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Add Driver
        </button>
      </div>

      <div className="flex gap-2">
        {['','AVAILABLE','ON_TRIP','ON_LEAVE','INACTIVE'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {drivers.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Users size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No drivers found. Add your first driver.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d: any) => (
            <div key={d.id} className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0">
                  {d.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zi-white truncate">{d.full_name}</p>
                  <p className="text-xs text-zi-muted flex items-center gap-1"><Phone size={9} />****{d.mobile_last4}</p>
                </div>
                <DriverStatus status={d.status} />
              </div>
              {d.license_no && <p className="text-xs text-zi-muted">DL: {d.license_no}</p>}
              <div className="flex items-center gap-2">
                {d.avg_rating > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400">
                    <Star size={10} fill="currentColor" /> {d.avg_rating.toFixed(1)} ({d.total_trips} trips)
                  </span>
                )}
              </div>
              <button onClick={() => openEdit(d)} className="w-full py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">Edit</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">{editing ? 'Edit Driver' : 'Add Driver'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Full Name *" err={errors.full_name}><input value={form.full_name} onChange={e => set('full_name', e.target.value)} className={ic(!!errors.full_name)} /></Fld>
                {!editing
                  ? <Fld label="Mobile *" err={errors.mobile}><input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} maxLength={10} placeholder="10-digit" className={ic(!!errors.mobile)} /></Fld>
                  : <Fld label="Mobile"><div className={`${ic(false)} text-zi-muted/60`}>****{editing.mobile_last4}</div></Fld>
                }
                <Fld label="DL Number"><input value={form.license_no} onChange={e => set('license_no', e.target.value)} className={ic(false)} /></Fld>
                <Fld label="DL Expiry"><input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} className={ic(false)} /></Fld>
                <Fld label="Aadhaar Last 4" err={errors.aadhaar_last4}><input value={form.aadhaar_last4} onChange={e => set('aadhaar_last4', e.target.value)} maxLength={4} className={ic(!!errors.aadhaar_last4)} /></Fld>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted">Emergency Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Name"><input value={form.emergency_name} onChange={e => set('emergency_name', e.target.value)} className={ic(false)} /></Fld>
                <Fld label="Mobile" err={errors.emergency_mobile}><input type="tel" value={form.emergency_mobile} onChange={e => set('emergency_mobile', e.target.value)} maxLength={10} className={ic(!!errors.emergency_mobile)} /></Fld>
              </div>
              <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic(false)} /></Fld>
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

function DriverStatus({ status }: { status: string }) {
  const map: Record<string,string> = {
    AVAILABLE: 'bg-green-500/15 text-green-400', ON_TRIP: 'bg-blue-500/15 text-blue-400',
    ON_LEAVE:  'bg-yellow-500/15 text-yellow-400', INACTIVE: 'bg-zi-muted/15 text-zi-muted',
  }
  return <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${map[status] ?? map.INACTIVE}`}>{status?.replace('_',' ')}</span>
}
function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}{err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}</div>
}
