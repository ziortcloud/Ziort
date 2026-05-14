import { useState, useEffect } from 'react'
import { Building2, Check } from 'lucide-react'
import { useZiLoadProfile, useUpdateZiLoadProfile } from '../hooks/useZiLoad'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const COMPANY_TYPES = ['SHIPPER','TRANSPORTER','BROKER','BOTH']
const FLEET_SIZES   = ['1-5','6-20','21-50','50+']

export default function ProfilePage({ entityId, subscriptionId }: Props) {
  const { data: profile, isLoading } = useZiLoadProfile(entityId, subscriptionId)
  const updateProfile = useUpdateZiLoadProfile(entityId, subscriptionId)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    company_name: '', company_type: 'SHIPPER', gst_number: '', pan_number: '',
    contact_name: '', contact_email: '', address: '', city: '', state: '',
    fleet_size: '', operating_states: '', services_offered: '', about: '',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        company_name:      profile.company_name      ?? '',
        company_type:      profile.company_type      ?? 'SHIPPER',
        gst_number:        profile.gst_number        ?? '',
        pan_number:        profile.pan_number        ?? '',
        contact_name:      profile.contact_name      ?? '',
        contact_email:     profile.contact_email     ?? '',
        address:           profile.address           ?? '',
        city:              profile.city              ?? '',
        state:             profile.state             ?? '',
        fleet_size:        profile.fleet_size        ?? '',
        operating_states:  (profile.operating_states ?? []).join(', '),
        services_offered:  (profile.services_offered ?? []).join(', '),
        about:             profile.about             ?? '',
      })
    }
  }, [profile])

  function set(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function save() {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      await updateProfile.mutateAsync({
        company_name:     form.company_name.trim(),
        company_type:     form.company_type,
        gst_number:       form.gst_number   || undefined,
        pan_number:       form.pan_number   || undefined,
        contact_name:     form.contact_name || undefined,
        contact_email:    form.contact_email || undefined,
        address:          form.address      || undefined,
        city:             form.city         || undefined,
        state:            form.state        || undefined,
        fleet_size:       form.fleet_size   || undefined,
        operating_states: form.operating_states ? form.operating_states.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        services_offered: form.services_offered ? form.services_offered.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        about:            form.about        || undefined,
      })
      toast.success('Profile updated')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = 'w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors'

  if (isLoading) return (
    <div className="p-6"><div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-orbit-deep rounded-xl animate-pulse" />)}</div></div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
          <Building2 size={18} className="text-green-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Company Profile</h1>
          <p className="text-xs text-zi-muted">Your marketplace identity</p>
        </div>
      </div>

      <Section label="Company Info">
        <Row2>
          <Fld label="Company Name *"><input value={form.company_name} onChange={e => set('company_name', e.target.value)} className={ic} /></Fld>
          <Fld label="Company Type">
            <select value={form.company_type} onChange={e => set('company_type', e.target.value)} className={ic}>
              {COMPANY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Fld>
          <Fld label="GST Number"><input value={form.gst_number} onChange={e => set('gst_number', e.target.value)} placeholder="22AAAAA0000A1Z5" className={ic} /></Fld>
          <Fld label="PAN Number"><input value={form.pan_number} onChange={e => set('pan_number', e.target.value)} placeholder="ABCDE1234F" className={ic} /></Fld>
        </Row2>
      </Section>

      <Section label="Contact">
        <Row2>
          <Fld label="Contact Person"><input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={ic} /></Fld>
          <Fld label="Email"><input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={ic} /></Fld>
        </Row2>
        <Fld label="Address"><input value={form.address} onChange={e => set('address', e.target.value)} className={ic} /></Fld>
        <Row2>
          <Fld label="City"><input value={form.city} onChange={e => set('city', e.target.value)} className={ic} /></Fld>
          <Fld label="State"><input value={form.state} onChange={e => set('state', e.target.value)} className={ic} /></Fld>
        </Row2>
      </Section>

      <Section label="Operations">
        <Row2>
          <Fld label="Fleet Size">
            <select value={form.fleet_size} onChange={e => set('fleet_size', e.target.value)} className={ic}>
              <option value="">Select…</option>
              {FLEET_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Fld>
          <div />
        </Row2>
        <Fld label="Operating States (comma separated)">
          <input value={form.operating_states} onChange={e => set('operating_states', e.target.value)} placeholder="Maharashtra, Gujarat, Rajasthan" className={ic} />
        </Fld>
        <Fld label="Services Offered (comma separated)">
          <input value={form.services_offered} onChange={e => set('services_offered', e.target.value)} placeholder="FTL, LTL, ODC, Refrigerated" className={ic} />
        </Fld>
        <Fld label="About">
          <textarea value={form.about} onChange={e => set('about', e.target.value)} rows={3}
            className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors resize-none" />
        </Fld>
      </Section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> Save Profile</>}
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
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
}
