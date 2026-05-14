'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X, Lock, CheckCircle2, AlertCircle, Loader2, Package2,
} from 'lucide-react'
import { useCloseLoan } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate } from '../lib/fmt'

const Schema = z.object({
  closure_date:     z.string().min(1, 'Date required'),
  closure_type:     z.enum(['full_payment', 'settlement', 'auction', 'waiver']),
  settlement_rupees: z.number({ invalid_type_error: 'Enter amount' }).nonnegative(),
  closure_notes:    z.string().max(500).optional(),
  release_items:    z.boolean().default(true),
})
type FormData = z.infer<typeof Schema>

interface Props {
  loanId: string
  loanCode: string
  customerName: string
  outstandingPaise: number
  liveTotalDuePaise: number
  onClose: () => void
}

const TYPE_OPTIONS = [
  { value: 'full_payment', label: 'Full Payment',  desc: 'Customer pays full outstanding + interest' },
  { value: 'settlement',   label: 'Settlement',    desc: 'Partial settlement by agreement' },
  { value: 'auction',      label: 'Auction',       desc: 'Items auctioned to recover dues' },
  { value: 'waiver',       label: 'Waiver',        desc: 'Outstanding waived (write-off)' },
]

export default function CloseLoanModal({
  loanId, loanCode, customerName, outstandingPaise, liveTotalDuePaise, onClose,
}: Props) {
  const mutation = useCloseLoan(loanId)
  const [success, setSuccess] = useState<any>(null)
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(Schema),
      defaultValues: {
        closure_date:     today,
        closure_type:     'full_payment',
        settlement_rupees: Math.ceil(liveTotalDuePaise / 100),
        release_items:    true,
      },
    })

  const closureType = watch('closure_type')

  const onSubmit = async (data: FormData) => {
    try {
      const result = await mutation.mutateAsync({
        closure_date:     data.closure_date,
        closure_type:     data.closure_type,
        settlement_paise: Math.round(data.settlement_rupees * 100),
        closure_notes:    data.closure_notes || undefined,
        release_items:    data.release_items,
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
              <Lock size={16} className="text-red-400" /> Close Loan
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
                  <p className="text-zi-white font-display font-bold text-lg">Loan Closed!</p>
                  <p className="text-zi-muted text-sm capitalize">
                    {success.closure?.closure_type?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              {success.summary && (
                <div className="bg-orbit-midnight/60 rounded-lg p-4 space-y-2 text-sm">
                  <Row label="Settlement"      value={fmtPaise(success.summary.settlement_paise)}      color="text-green-400" />
                  <Row label="Interest Paid"   value={fmtPaise(success.summary.interest_paise)}        color="text-zi-gold" />
                  <Row label="Penalty Paid"    value={fmtPaise(success.summary.penalty_paise)}         color="text-red-400" />
                  {success.summary.rebate_paise > 0 && (
                    <Row label="Rebate Applied" value={fmtPaise(success.summary.rebate_paise)}         color="text-zi-cyan" />
                  )}
                  <Row label="Items Released"  value={success.summary.items_released ? 'Yes' : 'No'}  color="text-zi-muted" />
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-5 space-y-4 overflow-y-auto flex-1">

              <div className="grid grid-cols-2 gap-2 bg-orbit-midnight/60 rounded-lg p-4">
                <div>
                  <p className="text-zi-muted text-xs">Outstanding</p>
                  <p className="font-bold text-zi-white">{fmtPaise(outstandingPaise)}</p>
                </div>
                <div>
                  <p className="text-zi-muted text-xs">Total Due Now</p>
                  <p className="font-bold text-red-400">{fmtPaise(liveTotalDuePaise)}</p>
                </div>
              </div>

              {mutation.error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle size={14} />
                  {mutation.error instanceof Error ? mutation.error.message : 'Closure failed'}
                </div>
              )}

              {/* Closure type */}
              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Closure Type</label>
                <div className="space-y-1.5">
                  {TYPE_OPTIONS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                  ${closureType === opt.value
                                    ? 'border-zi-cyan/50 bg-zi-cyan/5'
                                    : 'border-white/8 hover:border-white/15'
                                  }`}>
                      <input type="radio" {...register('closure_type')} value={opt.value} className="mt-0.5 accent-zi-cyan" />
                      <div>
                        <p className="text-sm font-medium text-zi-white">{opt.label}</p>
                        <p className="text-xs text-zi-muted">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Closure Date</label>
                  <input {...register('closure_date')} type="date"
                    className="zi-input w-full" max={today} />
                  {errors.closure_date && <p className="text-red-400 text-xs">{errors.closure_date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Settlement Amount (₹)</label>
                  <input {...register('settlement_rupees', { valueAsNumber: true })}
                    type="number" step="0.01" min="0"
                    className="zi-input w-full" />
                  {errors.settlement_rupees && <p className="text-red-400 text-xs">{errors.settlement_rupees.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Notes (optional)</label>
                <textarea {...register('closure_notes')} rows={2}
                  placeholder="Add any relevant notes…"
                  className="zi-input w-full resize-none" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer py-2">
                <input {...register('release_items')} type="checkbox"
                  className="w-4 h-4 rounded accent-zi-cyan" />
                <span className="text-sm text-zi-white flex items-center gap-1.5">
                  <Package2 size={14} className="text-zi-gold" />
                  Release pledged items to customer
                </span>
              </label>

              <button type="submit" disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-red-500/80 hover:bg-red-500 text-white font-semibold text-sm
                           transition-all disabled:opacity-50">
                {isSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                  : <><Lock size={14} /> Close Loan</>
                }
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
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
