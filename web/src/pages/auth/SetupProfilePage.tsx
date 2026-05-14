import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Building2, ChevronRight } from 'lucide-react'
import { apiPost } from '../../core/api/client'
import { useSessionStore } from '../../core/store/session'
import SpaceBackground from '../../components/SpaceBackground'
import Logo from '../../components/Logo'

const ENTITY_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'company',        label: 'Private / Public Company' },
  { value: 'partnership',    label: 'Partnership Firm' },
  { value: 'trust',          label: 'Trust / NGO' },
  { value: 'individual',     label: 'Individual' },
]

const schema = z.object({
  display_name: z.string().min(2, 'Enter your full name'),
  legal_name:   z.string().min(2, 'Enter your business name'),
  entity_type:  z.string().min(1, 'Select a business type'),
})
type Form = z.infer<typeof schema>

export default function SetupProfilePage() {
  const navigate      = useNavigate()
  const { loadSession } = useSessionStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { entity_type: '' },
  })
  const displayName = watch('display_name')

  async function onSubmit(data: Form) {
    setError(null)
    try {
      await apiPost('/auth/setup', data)
      await loadSession()
      navigate('/hub', { replace: true })
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Setup failed. Please try again.')
    }
  }

  return (
    <div className="relative min-h-screen bg-orbit-midnight flex items-center justify-center p-4">
      <SpaceBackground />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md">

        <div className="flex justify-center mb-8">
          <Logo size="lg" linked={false} />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          {[1, 2].map(n => (
            <div key={n} className={`flex items-center gap-2 ${n < step ? 'text-zi-cyan' : n === step ? 'text-zi-white' : 'text-zi-muted'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border
                ${n < step ? 'bg-zi-cyan/20 border-zi-cyan text-zi-cyan' :
                  n === step ? 'bg-zi-blue/20 border-zi-blue text-zi-white' :
                  'bg-orbit-navy border-white/10'}`}>
                {n}
              </div>
              {n === 1 && <ChevronRight size={14} className="text-zi-muted" />}
            </div>
          ))}
        </div>

        <div className="bg-orbit-deep border border-white/8 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-zi-blue/15 flex items-center justify-center">
                      <User size={16} className="text-zi-blue" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zi-white">Your profile</h2>
                      <p className="text-xs text-zi-muted">Tell us your name</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zi-muted mb-1.5">Full name</label>
                      <input {...register('display_name')} placeholder="Rajesh Kumar"
                        className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                                   placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors" />
                      {errors.display_name && <p className="mt-1 text-xs text-red-400">{errors.display_name.message}</p>}
                    </div>
                  </div>

                  <button type="button" onClick={() => displayName?.trim().length >= 2 && setStep(2)}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zi-blue hover:bg-zi-blue/90
                               rounded-lg text-sm font-medium text-white transition-colors">
                    Continue <ChevronRight size={14} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-zi-gold/15 flex items-center justify-center">
                      <Building2 size={16} className="text-zi-gold" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zi-white">Your business</h2>
                      <p className="text-xs text-zi-muted">Set up your first entity</p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zi-muted mb-1.5">Business name</label>
                      <input {...register('legal_name')} placeholder="e.g. Sri Murugan Jewels"
                        className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                                   placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors" />
                      {errors.legal_name && <p className="mt-1 text-xs text-red-400">{errors.legal_name.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zi-muted mb-1.5">Legal entity type</label>
                      <select {...register('entity_type')}
                        className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                                   focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors">
                        <option value="" disabled>Select entity type…</option>
                        {ENTITY_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {errors.entity_type && <p className="mt-1 text-xs text-red-400">{errors.entity_type.message}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 px-4 py-2.5 bg-orbit-navy border border-white/8 hover:border-white/15 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
                      Back
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zi-gold hover:bg-zi-gold/90
                                 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                      {isSubmitting
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : 'Launch Ziort'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
