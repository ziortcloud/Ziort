import { useState, useEffect } from 'react'
import { User, Check, Star } from 'lucide-react'
import { useDriverProfile, useCreateDriverProfile, useUpdateDriverProfile, useMyRatings } from '../hooks/useZiDriver'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const VEHICLE_TYPES = ['LCV','HCV','Open Body','Container','Tanker','Tipper','Refrigerated']
const LANGUAGES     = ['Hindi','English','Tamil','Telugu','Kannada','Malayalam','Marathi','Gujarati','Punjabi','Bengali']
const EXP_RANGES    = ['0-1 years','1-3 years','3-5 years','5-10 years','10+ years']

export default function ProfilePage({ entityId, subscriptionId }: Props) {
  const { data: profile, isLoading } = useDriverProfile(entityId, subscriptionId)
  const { data: ratingsData }        = useMyRatings(entityId, subscriptionId)
  const createProfile = useCreateDriverProfile(entityId, subscriptionId)
  const updateProfile = useUpdateDriverProfile(entityId, subscriptionId)
  const [saving, setSaving] = useState(false)
  const isNew = !profile

  const [form, setForm] = useState({
    full_name: '', license_no: '', license_expiry: '', experience: '',
    vehicle_types: [] as string[], languages: [] as string[],
    current_location: '', bio: '', daily_rate_str: '',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:        profile.full_name        ?? '',
        license_no:       profile.license_no       ?? '',
        license_expiry:   profile.license_expiry   ?? '',
        experience:       profile.experience        ?? '',
        vehicle_types:    profile.vehicle_types    ?? [],
        languages:        profile.languages         ?? [],
        current_location: profile.current_location ?? '',
        bio:              profile.bio              ?? '',
        daily_rate_str:   profile.daily_rate_paise ? String(profile.daily_rate_paise / 100) : '',
      })
    }
  }, [profile])

  function set(k: keyof typeof form, v: any) { setForm(p => ({ ...p, [k]: v })) }

  function toggleArray(k: 'vehicle_types' | 'languages', val: string) {
    setForm(p => ({
      ...p, [k]: p[k].includes(val) ? p[k].filter((x: string) => x !== val) : [...p[k], val],
    }))
  }

  async function save() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = {
        full_name:        form.full_name.trim(),
        license_no:       form.license_no       || undefined,
        license_expiry:   form.license_expiry   || undefined,
        experience:       form.experience        || undefined,
        vehicle_types:    form.vehicle_types.length ? form.vehicle_types : undefined,
        languages:        form.languages.length  ? form.languages  : undefined,
        current_location: form.current_location || undefined,
        bio:              form.bio              || undefined,
        daily_rate_paise: form.daily_rate_str   ? Math.round(parseFloat(form.daily_rate_str) * 100) : undefined,
      }
      if (isNew) {
        await createProfile.mutateAsync(payload)
        toast.success('Profile created')
      } else {
        await updateProfile.mutateAsync(payload)
        toast.success('Profile updated')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = 'w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors'
  const ratings = ratingsData?.data ?? []
  const avgRating = ratings.length ? (ratings.reduce((a: number, r: any) => a + r.rating, 0) / ratings.length).toFixed(1) : null

  if (isLoading) return (
    <div className="p-6"><div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-orbit-deep rounded-xl animate-pulse" />)}</div></div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <User size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zi-white">{profile?.full_name ?? 'Driver Profile'}</h1>
            {avgRating && (
              <p className="text-xs text-zi-muted flex items-center gap-1">
                <Star size={11} className="text-amber-400" fill="currentColor" /> {avgRating} · {ratings.length} ratings
              </p>
            )}
          </div>
        </div>
        {isNew && (
          <span className="px-2 py-1 bg-purple-500/15 text-purple-400 rounded-lg text-xs font-semibold">Setup Required</span>
        )}
      </div>

      <Section label="Personal Info">
        <Row2>
          <Fld label="Full Name *"><input value={form.full_name} onChange={e => set('full_name', e.target.value)} className={ic} /></Fld>
          <Fld label="Experience">
            <select value={form.experience} onChange={e => set('experience', e.target.value)} className={ic}>
              <option value="">Select…</option>
              {EXP_RANGES.map(e => <option key={e}>{e}</option>)}
            </select>
          </Fld>
          <Fld label="License No."><input value={form.license_no} onChange={e => set('license_no', e.target.value)} className={ic} /></Fld>
          <Fld label="License Expiry"><input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} className={ic} /></Fld>
          <Fld label="Current Location"><input value={form.current_location} onChange={e => set('current_location', e.target.value)} placeholder="City" className={ic} /></Fld>
          <Fld label="Daily Rate (₹)"><input type="number" step="1" value={form.daily_rate_str} onChange={e => set('daily_rate_str', e.target.value)} className={ic} /></Fld>
        </Row2>
        <Fld label="Bio">
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2}
            className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors resize-none" />
        </Fld>
      </Section>

      <Section label="Vehicle Types I Drive">
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map(vt => (
            <button key={vt} type="button" onClick={() => toggleArray('vehicle_types', vt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.vehicle_types.includes(vt) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-orbit-navy border-white/8 text-zi-muted hover:text-zi-white'}`}>
              {vt}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Languages">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button key={lang} type="button" onClick={() => toggleArray('languages', lang)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.languages.includes(lang) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-orbit-navy border-white/8 text-zi-muted hover:text-zi-white'}`}>
              {lang}
            </button>
          ))}
        </div>
      </Section>

      {ratings.length > 0 && (
        <Section label="Recent Ratings">
          <div className="space-y-2">
            {ratings.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-start gap-3">
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1,2,3,4,5].map(n => <Star key={n} size={10} className={n <= r.rating ? 'text-amber-400' : 'text-zi-muted/30'} fill={n <= r.rating ? 'currentColor' : 'none'} />)}
                </div>
                {r.comment && <p className="text-xs text-zi-muted flex-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-purple-500 hover:bg-purple-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={14} /> {isNew ? 'Create Profile' : 'Save Profile'}</>}
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
function Row2({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-3">{children}</div> }
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
}
