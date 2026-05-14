'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X, IndianRupee, CheckCircle2, AlertCircle,
  Loader2, CreditCard, Banknote, Smartphone,
  ArrowRight,
} from 'lucide-react'
import { useRecordPayment } from '../hooks/use-zipawn'
import { fmtPaise, fmtDate, PAYMENT_MODE_LABELS } from '../lib/fmt'

const Schema = z.object({
  amount_rupees:  z.number({ invalid_type_error: 'Enter amount' }).positive('Must be positive'),
  payment_date:   z.string().min(1, 'Date required'),
  payment_mode:   z.enum(['cash', 'upi', 'neft', 'rtgs', 'cheque', 'imps']),
  cheque_number:  z.string().optional(),
  transaction_ref: z.string().optional(),
})
type FormData = z.infer<typeof Schema>

const MODES = [
  { value: 'cash',   label: 'Cash',   icon: Banknote },
  { value: 'upi',    label: 'UPI',    icon: Smartphone },
  { value: 'neft',   label: 'NEFT',   icon: CreditCard },
  { value: 'rtgs',   label: 'RTGS',   icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
  { value: 'imps',   label: 'IMPS',   icon: CreditCard },
]

interface Props {
  loanId: string
  outstandingPaise: number
  loanCode: string
  customerName: string
  onClose: () => void
}

export default function PaymentModal({ loanId, outstandingPaise, loanCode, customerName, onClose }: Props) {
  const mutation = useRecordPayment(loanId)
  const [success, setSuccess] = useState<any>(null)
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(Schema),
      defaultValues: { payment_date: today, payment_mode: 'cash' },
    })

  const mode       = watch('payment_mode')
  const amtRupees  = watch('amount_rupees')
  const amtPaise   = Math.round((amtRupees || 0) * 100)

  const onSubmit = async (data: FormData) => {
    try {
      const result = await mutation.mutateAsync({
        payment_amount_paise: Math.round(data.amount_rupees * 100),
        payment_date:         data.payment_date,
        payment_mode:         data.payment_mode,
        cheque_number:        data.cheque_number || undefined,
        transaction_ref:      data.transaction_ref || undefined,
      })
      setSuccess(result)
    } catch (e: any) {
      // error shown via mutation.error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!success ? onClose : undefined} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative w-full max-w-md bg-orbit-deep border border-white/10 rounded-xl
                   shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-zi-white text-base flex items-center gap-2">
              <IndianRupee size={16} className="text-zi-cyan" /> Record Payment
            </h2>
            <p className="text-zi-muted text-xs mt-0.5">{loanCode} · {customerName}</p>
          </div>
          <button onClick={onClose}
            className="text-zi-muted hover:text-zi-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            /* Success screen */
            <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 space-y-4">
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20
                                flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <div>
                  <p className="text-zi-white font-display font-bold text-lg">Payment Recorded</p>
                  <p className="text-zi-muted text-sm">{success.payment?.payment_code}</p>
                </div>
              </div>

              {/* Waterfall breakdown */}
              {success.waterfall && (
                <div className="bg-orbit-midnight/60 rounded-lg p-4 space-y-2">
                  <p className="text-zi-muted text-xs font-medium uppercase tracking-wider mb-3">
                    Allocation
                  </p>
                  <WaterfallRow label="Penalty" paise={success.waterfall.penalty_portion_paise} color="text-red-400" />
                  <WaterfallRow label="Interest" paise={success.waterfall.interest_portion_paise} color="text-zi-gold" />
                  <WaterfallRow label="Principal" paise={success.waterfall.principal_portion_paise} color="text-green-400" />
                  {success.waterfall.overpayment_paise > 0 && (
                    <WaterfallRow label="Overpayment" paise={success.waterfall.overpayment_paise} color="text-zi-cyan" />
                  )}
                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                    <span className="text-zi-muted text-xs">Outstanding after</span>
                    <span className={`text-sm font-bold ${success.loan_after?.is_closed ? 'text-green-400' : 'text-zi-white'}`}>
                      {success.loan_after?.is_closed
                        ? '✓ Loan Closed!'
                        : fmtPaise(success.loan_after?.outstanding_paise ?? 0)
                      }
                    </span>
                  </div>
                </div>
              )}

              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </motion.div>
          ) : (
            /* Payment form */
            <motion.form key="form" onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-5 space-y-4">

              {/* Outstanding banner */}
              <div className="flex items-center justify-between bg-orbit-midnight/60 rounded-lg px-4 py-3">
                <span className="text-zi-muted text-sm">Outstanding</span>
                <span className="font-display font-bold text-zi-white text-lg">
                  {fmtPaise(outstandingPaise)}
                </span>
              </div>

              {mutation.error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle size={14} />
                  {mutation.error instanceof Error ? mutation.error.message : 'Payment failed'}
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zi-muted font-display">₹</span>
                  <input {...register('amount_rupees', { valueAsNumber: true })}
                    type="number" step="0.01" min="1" placeholder="0.00"
                    className="zi-input pl-7 w-full font-display text-lg"
                    autoFocus />
                </div>
                {errors.amount_rupees && (
                  <p className="text-red-400 text-xs">{errors.amount_rupees.message}</p>
                )}
                {amtPaise > 0 && amtPaise > outstandingPaise && (
                  <p className="text-zi-gold text-xs">
                    Overpayment of {fmtPaise(amtPaise - outstandingPaise)} will be noted
                  </p>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MODES.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setValue('payment_mode', m.value as any)}
                      className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-xs
                                  font-medium transition-all
                                  ${mode === m.value
                                    ? 'border-zi-cyan bg-zi-cyan/10 text-zi-cyan'
                                    : 'border-white/10 text-zi-muted hover:border-white/20 hover:text-zi-white'
                                  }`}>
                      <m.icon size={12} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Date</label>
                <input {...register('payment_date')} type="date"
                  className="zi-input w-full" max={today} />
                {errors.payment_date && (
                  <p className="text-red-400 text-xs">{errors.payment_date.message}</p>
                )}
              </div>

              {/* Conditional fields */}
              {mode === 'cheque' && (
                <div className="space-y-1.5">
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Cheque Number</label>
                  <input {...register('cheque_number')} type="text"
                    placeholder="e.g. 000123" className="zi-input w-full" />
                </div>
              )}
              {['upi','neft','rtgs','imps'].includes(mode) && (
                <div className="space-y-1.5">
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Transaction Ref</label>
                  <input {...register('transaction_ref')} type="text"
                    placeholder="UTR / UPI ref" className="zi-input w-full" />
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-1
                           disabled:opacity-50">
                {isSubmitting
                  ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                  : <><ArrowRight size={14} /> Record Payment</>
                }
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function WaterfallRow({ label, paise, color }: { label: string; paise: number; color: string }) {
  if (paise === 0) return null
  return (
    <div className="flex justify-between items-center">
      <span className="text-zi-muted text-xs">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{fmtPaise(paise)}</span>
    </div>
  )
}
