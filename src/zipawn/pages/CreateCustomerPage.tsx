'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, UserPlus, CheckCircle2, AlertCircle, Loader2,
  User, Phone, Mail, MapPin, Shield, UserCheck,
} from 'lucide-react'
import { useCreateCustomer } from '../hooks/use-zipawn'

const STEPS = [
  { id: 1, label: 'Basic Info',   icon: User },
  { id: 2, label: 'KYC Details', icon: Shield },
  { id: 3, label: 'Nominee',     icon: UserCheck },
  { id: 4, label: 'Done',        icon: CheckCircle2 },
]

type FormState = {
  // Step 1
  full_name: string; full_name_local: string
  mobile: string; alternate_mobile: string
  email: string; dob: string; gender: string; occupation: string
  // Address
  address: string; city: string; state: string; pincode: string
  // Step 2
  id_type: string; id_number: string
  kyc_status: string; kyc_notes: string
  // Step 3
  nominee_name: string; nominee_relation: string
  nominee_dob: string; nominee_mobile: string
  guardian_name: string
}

const BLANK: FormState = {
  full_name: '', full_name_local: '',
  mobile: '', alternate_mobile: '',
  email: '', dob: '', gender: '', occupation: '',
  address: '', city: '', state: '', pincode: '',
  id_type: '', id_number: '',
  kyc_status: 'pending', kyc_notes: '',
  nominee_name: '', nominee_relation: '',
  nominee_dob: '', nominee_mobile: '', guardian_name: '',
}

export default function CreateCustomerPage() {
  const router = useRouter()
  const createMutation = useCreateCustomer()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(BLANK)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const Field = ({ label, name, type = 'text', placeholder, required }: {
    label: string; name: keyof FormState; type?: string; placeholder?: string; required?: boolean
  }) => (
    <div className="space-y-1">
      <label className="text-zi-muted text-xs">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        className="zi-input w-full text-sm"
      />
    </div>
  )

  const goNext = () => {
    if (step === 1) {
      if (!form.full_name.trim()) { setError('Full name is required'); return }
      if (!/^\d{10}$/.test(form.mobile)) { setError('Enter a valid 10-digit mobile number'); return }
    }
    setError(''); setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setError('')
    try {
      const payload: any = {
        full_name: form.full_name,
        mobile:    form.mobile,
      }
      if (form.full_name_local)  payload.full_name_local  = form.full_name_local
      if (form.alternate_mobile) payload.alternate_mobile = form.alternate_mobile
      if (form.email)            payload.email            = form.email
      if (form.dob)              payload.dob              = form.dob
      if (form.gender)           payload.gender           = form.gender
      if (form.occupation)       payload.occupation       = form.occupation
      if (form.address)          payload.address          = form.address
      if (form.city)             payload.city             = form.city
      if (form.state)            payload.state            = form.state
      if (form.pincode)          payload.pincode          = form.pincode
      if (form.id_type)          payload.id_type          = form.id_type
      if (form.id_number)        payload.id_number        = form.id_number
      payload.kyc_status         = form.kyc_status
      if (form.kyc_notes)        payload.kyc_notes        = form.kyc_notes
      if (form.nominee_name)     payload.nominee_name     = form.nominee_name
      if (form.nominee_relation) payload.nominee_relation = form.nominee_relation
      if (form.nominee_dob)      payload.nominee_dob      = form.nominee_dob
      if (form.nominee_mobile)   payload.nominee_mobile   = form.nominee_mobile
      if (form.guardian_name)    payload.guardian_name    = form.guardian_name

      const result = await createMutation.mutateAsync(payload)
      setCreatedId(result?.id ?? result?.customer?.id ?? '')
      setStep(4)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create customer')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/zipawn/customers"
          className="p-1.5 rounded-lg border border-white/10 text-zi-muted
                     hover:text-zi-white hover:border-white/20 transition-all">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-zi-white flex items-center gap-2">
            <UserPlus size={18} className="text-zi-cyan" /> New Customer
          </h1>
          <p className="text-zi-muted text-xs mt-0.5">Fill in customer details to register</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done    = step > s.id
          const current = step === s.id
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                               transition-all
                               ${current
                                 ? 'bg-zi-blue text-white'
                                 : done
                                 ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                 : 'bg-white/5 text-zi-muted'
                               }`}>
                <s.icon size={11} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-[16px] ${done ? 'bg-green-500/40' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                        text-red-400 rounded-lg px-3 py-2 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>

          {step === 1 && (
            <div className="zi-card p-5 space-y-4">
              <h2 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
                <User size={14} className="text-zi-cyan" /> Basic Information
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Field label="Full Name" name="full_name" placeholder="As on ID" required />
                </div>
                <Field label="Full Name (local language)" name="full_name_local" placeholder="Optional" />
                <div className="space-y-1">
                  <label className="text-zi-muted text-xs">Gender</label>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)}
                    className="zi-input w-full text-sm">
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Field label="Mobile (10 digits)" name="mobile" placeholder="9876543210" required />
                <Field label="Alternate Mobile"   name="alternate_mobile" placeholder="Optional" />
                <Field label="Email"              name="email" type="email" placeholder="Optional" />
                <Field label="Date of Birth"      name="dob" type="date" />
                <Field label="Occupation"         name="occupation" placeholder="e.g. Farmer" />
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-zi-muted text-xs font-medium uppercase tracking-wider mb-3">Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Address" name="address" placeholder="Street / door number" />
                  </div>
                  <Field label="City"    name="city"    placeholder="e.g. Hyderabad" />
                  <Field label="State"   name="state"   placeholder="e.g. Telangana" />
                  <Field label="Pincode" name="pincode" placeholder="500001" />
                </div>
              </div>
              <button onClick={goNext} className="btn-primary w-full text-sm">Next →</button>
            </div>
          )}

          {step === 2 && (
            <div className="zi-card p-5 space-y-4">
              <h2 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
                <Shield size={14} className="text-zi-cyan" /> KYC Details
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zi-muted text-xs">ID Type</label>
                  <select value={form.id_type} onChange={e => set('id_type', e.target.value)}
                    className="zi-input w-full text-sm">
                    <option value="">Select…</option>
                    <option value="aadhaar">Aadhaar</option>
                    <option value="pan">PAN</option>
                    <option value="voter_id">Voter ID</option>
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving License</option>
                  </select>
                </div>
                <Field label="ID Number" name="id_number" placeholder="Will be hashed" />
                <div className="space-y-1">
                  <label className="text-zi-muted text-xs">KYC Status</label>
                  <select value={form.kyc_status} onChange={e => set('kyc_status', e.target.value)}
                    className="zi-input w-full text-sm">
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="verified">Verified</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Field label="KYC Notes" name="kyc_notes" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 btn-secondary text-sm">← Back</button>
                <button onClick={goNext} className="flex-1 btn-primary text-sm">Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="zi-card p-5 space-y-4">
              <h2 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
                <UserCheck size={14} className="text-zi-cyan" /> Nominee Details
                <span className="text-zi-muted text-xs font-normal">(optional)</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nominee Name"     name="nominee_name"     placeholder="Full name" />
                <Field label="Relation"         name="nominee_relation" placeholder="e.g. Spouse" />
                <Field label="Nominee DOB"      name="nominee_dob" type="date" />
                <Field label="Nominee Mobile"   name="nominee_mobile"   placeholder="10 digits" />
                <div className="col-span-2 border-t border-white/5 pt-3">
                  <Field label="Guardian Name (if minor nominee)" name="guardian_name" placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 btn-secondary text-sm">← Back</button>
                <button onClick={handleSubmit} disabled={createMutation.isPending}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {createMutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                    : <><UserPlus size={14} /> Create Customer</>
                  }
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="zi-card p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20
                              flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-zi-white">Customer Registered!</h2>
                <p className="text-zi-muted text-sm mt-1">{form.full_name} has been added successfully.</p>
              </div>
              <div className="flex gap-3 justify-center">
                {createdId && (
                  <Link href={`/zipawn/customers/${createdId}`} className="btn-primary text-sm">
                    View Profile
                  </Link>
                )}
                <Link href={`/zipawn/tickets/new${createdId ? '?customer=' + createdId : ''}`}
                  className="btn-secondary text-sm">
                  Create Loan
                </Link>
                <Link href="/zipawn/customers" className="btn-secondary text-sm">
                  All Customers
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
