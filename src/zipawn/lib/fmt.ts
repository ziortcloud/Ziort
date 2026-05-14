import type { LoanStatus } from '../types'

export function fmtPaise(paise: number): string {
  const rupees = paise / 100
  return rupees.toLocaleString('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

export function fmtPaiseDecimal(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short',
    })
  } catch { return iso }
}

export const STATUS_LABEL: Record<LoanStatus, string> = {
  pending:      'Pending',
  active:       'Active',
  interest_due: 'Interest Due',
  overdue:      'Overdue',
  released:     'Released',
  auctioned:    'Auctioned',
  written_off:  'Written Off',
}

export const STATUS_COLOR: Record<LoanStatus, string> = {
  pending:      'text-zi-muted   bg-white/5        border-white/10',
  active:       'text-green-400  bg-green-500/10   border-green-500/20',
  interest_due: 'text-zi-gold    bg-yellow-500/10  border-yellow-500/20',
  overdue:      'text-red-400    bg-red-500/10     border-red-500/20',
  released:     'text-zi-cyan    bg-cyan-500/10    border-cyan-500/20',
  auctioned:    'text-orange-400 bg-orange-500/10  border-orange-500/20',
  written_off:  'text-red-500    bg-red-600/10     border-red-600/20',
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash:    'Cash',
  upi:     'UPI',
  neft:    'NEFT',
  rtgs:    'RTGS',
  cheque:  'Cheque',
  imps:    'IMPS',
}
