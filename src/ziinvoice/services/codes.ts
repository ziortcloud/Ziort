import { nextYearCode } from '@/ziorbitcore/services/codes'

export const nextInvoiceCode = () => nextYearCode('INV')   // INV26A01
export const nextPaymentCode  = () => nextYearCode('IPAY')  // IPAY26A01 (internal invoice payment)
