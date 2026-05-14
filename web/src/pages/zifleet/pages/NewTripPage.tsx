import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useVehicles, useDrivers, useCreateTrip } from '../hooks/useZiFleet'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const CARGO_TYPES = ['General','Fragile','Hazardous','Perishable','Heavy Machinery','Electronics','Chemicals','Automobile','Raw Material','Other']
const PAYMENT_MODES = ['CASH','UPI','BANK_TRANSFER','CHEQUE','CREDIT']

const EMPTY = {
  origin: '', destination: '', vehicle_id: '', driver_id: '',
  cargo_type: '', cargo_weight: '', lr_number: '',
  freight_paise_str: '', invoice_value_str: '',
  client_name: '', client_mobile: '',
  advance_paise_str: '', advance_mode: 'CASH',
  notes: '',
}
type F = typeof EMPTY

function validate(f: F) {
  const e: Record<string, string> = {}
  if (!f.origin.trim())       e.origin       = 'Origin is required'
  if (!f.destination.trim())  e.destination  = 'Destination is required'
  if (!f.freight_paise_str)   e.freight_paise_str = 'Freight amount is required'
  else if (parseFloat(f.freight_paise_str) <= 0) e.freight_paise_str = 'Must be positive'
  if (f.client_mobile && !/^\d{10}$/.test(f.client_mobile.replace(/\s/g, '')))
    e.client_mobile = '10-digit mobile required'
  return e
}

export default function NewTripPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const [form, setForm]     = useState<F>({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: vehiclesData } = useVehicles(entityId, subscriptionId, { status: 'AVAILABLE', limit: 100 })
  const { data: driversData }  = useDrivers(entityId, subscriptionId, { status: 'AVAILABLE', limit: 100 })
  const createTrip = useCreateTrip(entityId, subscriptionId)

  const vehicles = vehiclesData?.data ?? []
  const drivers  = driversData?.data  ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  async function submit() {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload: Record<string, any> = {
        origin:          form.origin.trim(),
        destination:     form.destination.trim(),
        vehicle_id:      form.vehicle_id || undefined,
        driver_id:       form.driver_id  || undefined,
        cargo_type:      form.cargo_type || undefined,
        cargo_weight:    form.cargo_weight    ? parseFloat(form.cargo_weight)    : undefined,
        lr_number:       form.lr_number       || undefined,
        freight_paise:   Math.round(parseFloat(form.freight_paise_str) * 100),
        invoice_value:   form.invoice_value_str ? Math.round(parseFloat(form.invoice_value_str) * 100) : undefined,
        client_name:     form.client_name || undefined,
        client_mobile:   form.client_mobile.replace(/\s/g, '') || undefined,
        advance_paise:   form.advance_paise_str ? Math.round(parseFloat(form.advance_paise_str) * 100) : undefined,
        advance_mode:    form.advance_paise_str ? form.advance_mode : undefined,
        notes:           form.notes || undefined,
      }
      const trip = await createTrip.mutateAsync(payload)
      toast.success('Trip created')
      navigate(`/zifleet/trips/${trip.id}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Create failed')
    } finally { setSaving(false) }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors`

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/zifleet/trips')} className="text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-zi-white">New Trip</h1>
          <p className="text-xs text-zi-muted">Create a new freight trip</p>
        </div>
      </div>

      {/* Route */}
      <Section label="Route">
        <Row2>
          <Fld label="Origin *" err={errors.origin}>
            <input value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Mumbai" className={ic(!!errors.origin)} />
          </Fld>
          <Fld label="Destination *" err={errors.destination}>
            <input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="Delhi" className={ic(!!errors.destination)} />
          </Fld>
        </Row2>
        <Row2>
          <Fld label="LR / Consignment No.">
            <input value={form.lr_number} onChange={e => set('lr_number', e.target.value)} className={ic()} />
          </Fld>
          <Fld label="Cargo Type">
            <select value={form.cargo_type} onChange={e => set('cargo_type', e.target.value)} className={ic()}>
              <option value="">Select…</option>
              {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Fld>
        </Row2>
        <Row2>
          <Fld label="Cargo Weight (tons)">
            <input type="number" step="0.1" value={form.cargo_weight} onChange={e => set('cargo_weight', e.target.value)} className={ic()} />
          </Fld>
          <div />
        </Row2>
      </Section>

      {/* Assignment */}
      <Section label="Assignment">
        <Row2>
          <Fld label="Vehicle">
            <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} className={ic()}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type})</option>
              ))}
            </select>
            {vehicles.length === 0 && <p className="mt-1 text-[10px] text-zi-muted/60">No available vehicles</p>}
          </Fld>
          <Fld label="Driver">
            <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)} className={ic()}>
              <option value="">Select driver…</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
            {drivers.length === 0 && <p className="mt-1 text-[10px] text-zi-muted/60">No available drivers</p>}
          </Fld>
        </Row2>
      </Section>

      {/* Client */}
      <Section label="Client Details">
        <Row2>
          <Fld label="Client Name">
            <input value={form.client_name} onChange={e => set('client_name', e.target.value)} className={ic()} />
          </Fld>
          <Fld label="Client Mobile" err={errors.client_mobile}>
            <input type="tel" value={form.client_mobile} onChange={e => set('client_mobile', e.target.value)} maxLength={10} placeholder="10-digit" className={ic(!!errors.client_mobile)} />
          </Fld>
        </Row2>
      </Section>

      {/* Freight & Payment */}
      <Section label="Freight & Payment">
        <Row2>
          <Fld label="Freight Amount (₹) *" err={errors.freight_paise_str}>
            <input type="number" step="1" value={form.freight_paise_str} onChange={e => set('freight_paise_str', e.target.value)} placeholder="15000" className={ic(!!errors.freight_paise_str)} />
          </Fld>
          <Fld label="Invoice / Cargo Value (₹)">
            <input type="number" step="1" value={form.invoice_value_str} onChange={e => set('invoice_value_str', e.target.value)} className={ic()} />
          </Fld>
        </Row2>
        <Row2>
          <Fld label="Advance Paid (₹)">
            <input type="number" step="1" value={form.advance_paise_str} onChange={e => set('advance_paise_str', e.target.value)} className={ic()} />
          </Fld>
          {form.advance_paise_str && (
            <Fld label="Advance Mode">
              <select value={form.advance_mode} onChange={e => set('advance_mode', e.target.value)} className={ic()}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Fld>
          )}
        </Row2>
      </Section>

      {/* Notes */}
      <Section label="Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
          className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors resize-none"
          placeholder="Any additional notes…" />
      </Section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => navigate('/zifleet/trips')} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
          Cancel
        </button>
        <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Create Trip</>}
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60">{label}</p>
      {children}
    </div>
  )
}
function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}
function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}
    </div>
  )
}
