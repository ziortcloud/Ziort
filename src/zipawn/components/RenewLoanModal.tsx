'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X, RefreshCcw, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { useRenewLoan } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate } from '../lib/fmt'

const Schema = z.object({
  renewal_type:         z.enum(['tenure_extension', 'topup', 'refinance']),
  renewal_date:         z.string().min(1, 'Date required'),
  new_tenure_days:      z.number({ invalid_type_error: 'Enter days' }).int().min(1).max(730),
  new_interest_rate_pm: z.number({ invalid_type_error: 'Enter rate' }).min(0.01).max(10).optional(),
  topup_rupees:         z.number().nonnegative().default(0),
  pay_interest_now:     z.boolean().default(true),
  renewal_fee_rupees:   z.number().nonnegative().default(0),
  remarks:              z.string().max(500).optional(),
})
type FormData = z.infer<typeof Schema>

interface Props {
  loanId: string
  loanCode: string
  customerName: string
  outstandingPaise: number
  currentRatePm: number
  currentTenureDays: number
  maturityDate: string
  onClose: () => void
}

const TYPE_LABELS = {
  tenure_extension: 'Tenure Extension',
  topup:            'Top-Up Loan',
  refinance:        'Refinance',
}

export default function RenewLoanModal({
  loanId, loanCode, customerName, outstandingPaise,
  currentRatePm, currentTenureDays, maturityDate, onClose,
}: Props) {
  const mutation = useRenewLoan(loanId)
  const [success, setSuccess] = useState<any>(null)
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(Schema),
      defaultValues: {
        renewal_type:    'tenure_extension',
        renewal_date:    today,
        new_tenure_days: currentTenureDays,
        pay_interest_now: true,
        topup_rupees:    0,
        renewal_fee_rupees: 0,
      },
    })

  const renewalType = watch('renewal_type')

  const onSubmit = async (data: FormData) => {
    try {
      const result = await mutation.mutateAsync({
        renewal_type:         data.renewal_type,
        renewal_date:         data.renewal_date,
        new_tenure_days:      data.new_tenure_days,
        new_interest_rate_pm: data.new_interest_rate_pm,
        topup_paise:          Math.round((data.topup_rupees ?? 0) * 100),
        pay_interest_now:     data.pay_interest_now,
        renewal_fee_paise:    Math.round((data.renewal_fee_rupees ?? 0) * 100),
        remarks:              data.remarks || undefined,
      })
      setSuccess(result)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!success ? onClose : undefined} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg bg-orbit-deep border border-white/10 rounded-xl
                   shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-display font-bold text-zi-white text-base flex items-center gap-2">
              <RefreshCcw size={16} className="text-zi-cyan" /> Renew Loan
            </h2>
            <p className="text-zi-muted text-xs mt-0.5">{loanCode} · {customerName}</p>
          </div>
          <button onClick={onClose} className="text-zi-muted hover:text-zi-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 space-y-4 overflow-y-auto">
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20
                                flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <div>
                  <p className="text-zi-white font-display font-bold text-lg">Loan Renewed!</p>
                  <p className="text-zi-muted text-sm">{TYPE_LABELS[success.renewal?.renewal_type as keyof typeof TYPE_LABELS]}</p>
                </div>
              </div>
              {success.summary && (
                <div className="bg-orbit-midnight/60 rounded-lg p-4 space-y-2 text-sm">
                  <Row label="New Outstanding" value={fmtPaise(success.summary.new_outstanding_paise)} color="text-zi-white" />
                  <Row label="New Maturity"    value={fmtDate(success.summary.new_maturity_date)}     color="text-zi-cyan" />
                  {success.summary.interest_cleared_paise > 0 && (
                    <Row label="Interest Cleared" value={fmtPaise(success.summary.interest_cleared_paise)} color="text-green-400" />
                  )}
                  {success.summary.topup_disbursed_paise > 0 && (
                    <Row label="Top-Up Disbursed" value={fmtPaise(success.summary.topup_disbursed_paise)} color="text-zi-gold" />
                  )}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Current outstanding */}
              <div className="flex items-center justify-between bg-orbit-midnight/60 rounded-lg px-4 py-3">
                <span className="text-zi-muted text-sm">Current Outstanding</span>
                <span className="font-display font-bold text-zi-white text-lg">{fmtPaise(outstandingPaise)}</span>
              </div>

              {mutation.error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle size={14} />
                  {mutation.error instanceof Error ? mutation.error.message : 'Renewal failed'}
                </div>
              )}

              {/* Renewal type */}
              <Field label="Renewal Type">
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(TYPE_LABELS) as [string, string][]).map(([val, lbl]) => (
                    <label key={val}
                      className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border
                                  text-xs font-medium cursor-pointer transition-all
                                  ${renewalType === val
                                    ? 'border-zi-cyan bg-zi-cyan/10 text-zi-cyan'
                                    : 'border-white/10 text-zi-muted hover:border-white/20'
                                  }`}>
                      <input type="radio" {...register('renewal_type')} value={val} className="sr-only" />
                      {lbl}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Renewal Date" error={errors.renewal_date?.message}>
                  <input {...register('renewal_date')} type="date"
                    className="zi-input w-full" max={today} />
                </Field>
                <Field label="New Tenure (days)" error={errors.new_tenure_days?.message}>
                  <input {...register('new_tenure_days', { valueAsNumber: true })}
                    type="number" min={1} max={730}
                    className="zi-input w-full" />
                </Field>
              </div>

              <Field label={`Interest Rate (% /month) — current: ${currentRatePm}%`}>
                <input {...register('new_interest_rate_pm', { valueAsNumber: true })}
                  type="number" step="0.01" min="0.01" max="10"
                  placeholder={`${currentRatePm} (keep current)`}
                  className="zi-input w-full" />
              </Field>

              {renewalType === 'topup' && (
                <Field label="Top-Up Amount (₹)">
                  <input {...register('topup_rupees', { valueAsNumber: true })}
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className="zi-input w-full" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Renewal Fee (₹)">
                  <input {...register('renewal_fee_rupees', { valueAsNumber: true })}
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className="zi-input w-full" />
                </Field>
                <Field label="">
                  <label className="flex items-center gap-2 h-full cursor-pointer pt-2">
                    <input {...register('pay_interest_now')} type="checkbox"
                      className="w-4 h-4 rounded accent-zi-cyan" />
                    <span className="text-sm text-zi-white">Clear interest now</span>
                  </label>
                </Field>
              </div>

              <Field label="Remarks (optional)">
                <input {...register('remarks')} type="text"
                  placeholder="e.g. customer request" className="zi-input w-full" />
              </Field>

              <button type="submit" disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-1
                           disabled:opacity-50">
                {isSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                  : <><RefreshCcw size={14} /> Renew Loan</>
                }
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function Field({ label, children, error }: {
  label: string; children: React.ReactNode; error?: string
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">{label}</label>
      )}
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zi-muted text-xs">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}
