// Customer create / edit / view — validates and maps to API schema correctly
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, FileText, MapPin, Edit2, CreditCard, Check, X, AlertCircle } from 'lucide-react'
import { useCustomer, useCreateCustomer, useUpdateCustomer, useLoans } from '../hooks/useZiPawn'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string; mode?: 'view' | 'create' }

type KycStatus   = 'pending' | 'submitted' | 'verified' | 'rejected' | 'waived'
type Gender      = 'male' | 'female' | 'other'
type IdType      = 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license'

const KYC_STATUSES: KycStatus[]  = ['pending', 'submitted', 'verified', 'rejected', 'waived']
const GENDERS:      Gender[]      = ['male', 'female', 'other']
const ID_TYPES:     IdType[]      = ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license']
const ID_LABELS: Record<IdType, string> = {
  aadhaar: 'Aadhaar', pan: 'PAN', voter_id: 'Voter ID', passport: 'Passport', driving_license: 'Driving Licence',
}

const EMPTY_FORM = {
  full_name: '', mobile: '', email: '', dob: '',
  gender: '' as '' | Gender,
  id_type: '' as '' | IdType, id_number: '',
  address: '', city: '', state: '', pincode: '',
  kyc_status: 'pending' as KycStatus,
}

type FormState = typeof EMPTY_FORM

function kycColor(s: string) {
  return s === 'verified' ? 'bg-green-500/15 text-green-400 border-green-500/20'
    :    s === 'pending'  ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
    :    s === 'rejected' ? 'bg-red-500/15 text-red-400 border-red-500/20'
    :                       'bg-white/5 text-zi-muted border-white/10'
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: FormState, isCreate: boolean): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.full_name.trim()) errs.full_name = 'Name is required'
  else if (form.full_name.trim().length < 2) errs.full_name = 'Name must be at least 2 characters'

  if (isCreate) {
    const mob = form.mobile.replace(/\s/g, '')
    if (!mob) errs.mobile = 'Mobile number is required'
    else if (!/^\d{10}$/.test(mob)) errs.mobile = 'Enter a valid 10-digit mobile number'
  }

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = 'Invalid email address'
  }

  if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
    errs.pincode = 'Pincode must be 6 digits'
  }

  if (form.id_type && form.id_number) {
    const id = form.id_number.replace(/\s/g, '').toUpperCase()
    if (form.id_type === 'aadhaar' && !/^\d{12}$/.test(id)) {
      errs.id_number = 'Aadhaar must be exactly 12 digits'
    } else if (form.id_type === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(id)) {
      errs.id_number = 'Invalid PAN format (e.g. ABCDE1234F)'
    }
  }

  return errs
}

// ─── Build API payload ────────────────────────────────────────────────────────
function toApiPayload(form: FormState, isCreate: boolean) {
  const payload: Record<string, unknown> = {
    full_name:  form.full_name.trim(),
    email:      form.email    || undefined,
    dob:        form.dob      || undefined,
    gender:     form.gender   || undefined,
    id_type:    form.id_type  || undefined,
    id_number:  form.id_number ? form.id_number.replace(/\s/g, '').toUpperCase() : undefined,
    address:    form.address  || undefined,
    city:       form.city     || undefined,
    state:      form.state    || undefined,
    pincode:    form.pincode  || undefined,
    kyc_status: form.kyc_status,
  }
  if (isCreate) payload.mobile = form.mobile.replace(/\s/g, '')
  return payload
}

export default function CustomerDetailPage({ entityId, subscriptionId, mode: modeProp }: Props) {
  const navigate                       = useNavigate()
  const { customerId }                 = useParams<{ customerId: string }>()
  const isCreate                       = modeProp === 'create' || !customerId
  const { data: customer, isLoading }  = useCustomer(entityId, subscriptionId, customerId ?? '')
  const { data: loansData }            = useLoans(entityId, subscriptionId, { customer_id: customerId, limit: 20 })
  const createMutation                 = useCreateCustomer(entityId, subscriptionId)
  const updateMutation                 = useUpdateCustomer(entityId, subscriptionId)
  const [editing, setEditing]          = useState(isCreate)
  const [form, setForm]                = useState<FormState>({ ...EMPTY_FORM })
  const [errors, setErrors]            = useState<Record<string, string>>({})
  const [saving, setSaving]            = useState(false)

  function startEdit() {
    if (customer) {
      setForm({
        full_name:  customer.full_name  ?? '',
        mobile:     '',
        email:      customer.email      ?? '',
        dob:        customer.dob        ?? '',
        gender:     (customer.gender    ?? '') as '' | Gender,
        id_type:    (customer.id_type   ?? '') as '' | IdType,
        id_number:  '',
        address:    customer.address    ?? '',
        city:       customer.city       ?? '',
        state:      customer.state      ?? '',
        pincode:    customer.pincode    ?? '',
        kyc_status: (customer.kyc_status ?? 'pending') as KycStatus,
      })
    }
    setErrors({})
    setEditing(true)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(p => ({ ...p, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  async function save() {
    const errs = validate(form, isCreate)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const payload = toApiPayload(form, isCreate)
      if (isCreate) {
        const created = await createMutation.mutateAsync(payload) as any
        toast.success('Customer created')
        navigate(`/zipawn/customers/${created?.id ?? ''}`)
      } else {
        await updateMutation.mutateAsync({ id: customerId!, body: payload })
        toast.success('Customer updated')
        setEditing(false)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading / not-found states ───────────────────────────────────────────
  if (!isCreate && isLoading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-orbit-deep rounded" />
      <div className="h-32 bg-orbit-deep rounded-xl" />
      <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl" />)}</div>
    </div>
  )
  if (!isCreate && !customer) return (
    <div className="p-6 text-center text-sm text-zi-muted py-24">Customer not found</div>
  )

  const loans = loansData?.data ?? []

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/zipawn/customers')}
          className="flex items-center gap-2 text-sm text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={14} /> Customers
        </button>
        {!isCreate && !editing && (
          <button onClick={startEdit}
            className="flex items-center gap-2 px-3 py-1.5 bg-orbit-deep border border-white/8 hover:border-white/16 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            <Edit2 size={13} /> Edit
          </button>
        )}
      </div>

      {/* ── View profile ── */}
      {!editing && customer && (
        <>
          <div className="flex items-center gap-5 p-6 rounded-2xl bg-orbit-deep border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-zi-blue/15 flex items-center justify-center text-2xl font-bold text-zi-blue shrink-0">
              {customer.full_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zi-white">{customer.full_name}</h1>
              <p className="text-sm text-zi-muted font-mono mt-0.5">{customer.zi_code}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${kycColor(customer.kyc_status)}`}>
                  {customer.kyc_status?.replace(/_/g, ' ') || 'No KYC'}
                </span>
                {customer.active_loans > 0 && (
                  <span className="text-[10px] text-zi-muted">{customer.active_loans} active loan{customer.active_loans !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard icon={Phone}    label="Mobile"      value={customer.mobile_last4 ? `**** **** ${customer.mobile_last4}` : '—'} />
            <InfoCard icon={User}     label="Gender · DOB" value={[
              customer.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : null,
              customer.dob ? format(new Date(customer.dob), 'dd MMM yyyy') : null,
            ].filter(Boolean).join(' · ') || '—'} />
            <InfoCard icon={FileText} label={customer.id_type ? ID_LABELS[customer.id_type as IdType] ?? customer.id_type : 'ID Proof'}
              value={customer.id_last6 ? `****${customer.id_last6}` : '—'} />
            <InfoCard icon={FileText} label="KYC Email"   value={customer.email || '—'} />
            <InfoCard icon={MapPin}   label="Address"
              value={[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '—'}
              className="sm:col-span-2" />
          </div>

          {loans.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted mb-3">Loan History</p>
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orbit-deep border-b border-white/5">
                      {['Loan ID', 'Principal', 'Outstanding', 'Status', 'Opened'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan: any) => (
                      <tr key={loan.id} onClick={() => navigate(`/zipawn/loans/${loan.id}`)}
                        className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-zi-cyan">{loan.zi_code}</td>
                        <td className="px-4 py-2.5 tabular-nums text-zi-white">₹{((loan.sanctioned_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5 tabular-nums text-zi-white">₹{((loan.outstanding_paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={loan.status} /></td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{loan.opened_at ? format(new Date(loan.opened_at), 'dd MMM yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={() => navigate(`/zipawn/tickets/new?customer=${customer.id}`)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600/10 border border-emerald-500/25 hover:bg-emerald-600/20 rounded-xl text-sm font-medium text-emerald-400 transition-colors">
            <CreditCard size={14} /> Create New Loan for this Customer
          </button>
        </>
      )}

      {/* ── Create / Edit form ── */}
      {editing && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-zi-white">{isCreate ? 'New Customer' : 'Edit Customer'}</h2>

          {/* Personal Details */}
          <FormSection title="Personal Details">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name *" error={errors.full_name}>
                <input value={form.full_name} onChange={e => setField('full_name', e.target.value)}
                  placeholder="As on ID document" className={inputCls(!!errors.full_name)} />
              </Field>
              {isCreate ? (
                <Field label="Mobile Number *" error={errors.mobile}>
                  <input type="tel" value={form.mobile} onChange={e => setField('mobile', e.target.value)}
                    placeholder="10-digit mobile" maxLength={10} className={inputCls(!!errors.mobile)} />
                </Field>
              ) : (
                <Field label="Mobile Number">
                  <div className={`${inputCls(false)} text-zi-muted/60 cursor-not-allowed`}>
                    {customer?.mobile_last4 ? `**** **** ${customer.mobile_last4}` : 'Not available'}
                  </div>
                </Field>
              )}
              <Field label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  placeholder="Optional" className={inputCls(!!errors.email)} />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dob} onChange={e => setField('dob', e.target.value)}
                  className={inputCls(false)} />
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={e => setField('gender', e.target.value as '' | Gender)}
                  className={inputCls(false)}>
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </Field>
            </div>
          </FormSection>

          {/* KYC */}
          <FormSection title="KYC Documents">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ID Type">
                <select value={form.id_type} onChange={e => { setField('id_type', e.target.value as '' | IdType); setField('id_number', '') }}
                  className={inputCls(false)}>
                  <option value="">Select ID type…</option>
                  {ID_TYPES.map(t => <option key={t} value={t}>{ID_LABELS[t]}</option>)}
                </select>
              </Field>
              <Field label={form.id_type ? `${ID_LABELS[form.id_type]} Number` : 'ID Number'} error={errors.id_number}>
                <input value={form.id_number}
                  onChange={e => setField('id_number', form.id_type === 'pan' ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={
                    form.id_type === 'aadhaar' ? '12-digit Aadhaar'
                    : form.id_type === 'pan'   ? 'ABCDE1234F'
                    : 'ID number'
                  }
                  maxLength={form.id_type === 'aadhaar' ? 12 : form.id_type === 'pan' ? 10 : 20}
                  disabled={!form.id_type}
                  className={inputCls(!!errors.id_number)} />
                {form.id_type === 'aadhaar' && (
                  <p className="text-[10px] text-zi-muted mt-1">Enter 12 digits — stored as a one-way hash for privacy</p>
                )}
                {!isCreate && form.id_type && (
                  <p className="text-[10px] text-zi-muted mt-1">Leave blank to keep existing ID unchanged</p>
                )}
              </Field>
              <Field label="KYC Status">
                <select value={form.kyc_status} onChange={e => setField('kyc_status', e.target.value as KycStatus)}
                  className={inputCls(false)}>
                  {KYC_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
            </div>
          </FormSection>

          {/* Address */}
          <FormSection title="Address">
            <div className="space-y-3">
              <Field label="Street / Landmark">
                <input value={form.address} onChange={e => setField('address', e.target.value)}
                  placeholder="House no, street, landmark" className={inputCls(false)} />
              </Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="City">
                  <input value={form.city} onChange={e => setField('city', e.target.value)} className={inputCls(false)} />
                </Field>
                <Field label="State">
                  <input value={form.state} onChange={e => setField('state', e.target.value)} className={inputCls(false)} />
                </Field>
                <Field label="Pincode" error={errors.pincode}>
                  <input value={form.pincode} onChange={e => setField('pincode', e.target.value)}
                    placeholder="6 digits" maxLength={6} className={inputCls(!!errors.pincode)} />
                </Field>
              </div>
            </div>
          </FormSection>

          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">Please fix the errors above before saving.</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isCreate && (
              <button onClick={() => { setEditing(false); setErrors({}) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
                <X size={13} /> Cancel
              </button>
            )}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check size={14} /> {isCreate ? 'Create Customer' : 'Save Changes'}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 bg-orbit-navy border ${hasError ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-zi-cyan/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">{title}</p>
      {children}
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, className = '' }: { icon: React.ElementType; label: string; value: string; className?: string }) {
  return (
    <div className={`p-4 rounded-xl bg-orbit-deep border border-white/5 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={12} className="text-zi-muted" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{label}</span>
      </div>
      <p className="text-sm text-zi-white">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:  'bg-green-500/15 text-green-400 border-green-500/20',
    overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
    closed:  'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[status] ?? map.closed}`}>{status}</span>
}
