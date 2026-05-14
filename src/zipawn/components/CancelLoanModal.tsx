'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, XCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useCancelLoan } from '../hooks/use-zipawn'

interface Props {
  loanId: string
  loanCode: string
  customerName: string
  onClose: () => void
}

export default function CancelLoanModal({ loanId, loanCode, customerName, onClose }: Props) {
  const mutation = useCancelLoan(loanId)
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState(false)

  const handleCancel = async () => {
    if (!reason.trim()) return
    try {
      await mutation.mutateAsync({ reason })
      setSuccess(true)
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
        className="relative w-full max-w-md bg-orbit-deep border border-white/10 rounded-xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-zi-white text-base flex items-center gap-2">
              <XCircle size={16} className="text-orange-400" /> Cancel Loan
            </h2>
            <p className="text-zi-muted text-xs mt-0.5">{loanCode} · {customerName}</p>
          </div>
          <button onClick={onClose} className="text-zi-muted hover:text-zi-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-5 space-y-4 text-center">
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20
                                flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-400" />
                </div>
                <p className="text-zi-white font-display font-bold text-lg">Loan Cancelled</p>
                <p className="text-zi-muted text-sm max-w-xs">
                  The loan has been cancelled. No further payments will be accepted.
                </p>
              </div>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-5 space-y-4">

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3.5">
                <p className="text-orange-300 text-sm font-medium">
                  This action cannot be undone.
                </p>
                <p className="text-orange-400/70 text-xs mt-1">
                  Cancelling will freeze the loan. Items must be returned separately.
                </p>
              </div>

              {mutation.error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle size={14} />
                  {mutation.error instanceof Error ? mutation.error.message : 'Cancellation failed'}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this loan is being cancelled…"
                  className="zi-input w-full resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={onClose}
                  className="flex-1 btn-secondary text-sm">
                  Go Back
                </button>
                <button type="button" onClick={handleCancel}
                  disabled={!reason.trim() || mutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             bg-orange-500/80 hover:bg-orange-500 text-white font-semibold text-sm
                             transition-all disabled:opacity-50">
                  {mutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                    : <><XCircle size={14} /> Confirm Cancel</>
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
