// ZiPawn — code generation helpers
import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

// Customer: alpha-grow, non-year (ZPCA01, ZPCA02, ...)
export const nextCustomerCode = () => nextCode('ZPC')

// Year-scoped transaction codes
export const nextTicketCode   = () => nextYearCode('PT')   // PT26A01
export const nextLoanCode     = () => nextYearCode('LN')   // LN26A01

// Item code: generated from ticket code + seq (no global counter needed)
export const itemCode  = (ticketCode: string, seq: number) =>
  `${ticketCode}-I${String(seq).padStart(2, '0')}`

// Payment code: generated from loan code + seq
export const paymentCode = (loanCode: string, seq: number) =>
  `${loanCode}-P${String(seq).padStart(3, '0')}`

// Ref code builders
export const customerRefCode = (entityCode: string, subCode: string, cstCode: string) =>
  `${entityCode}${subCode}${cstCode}`

export const ticketRefCode = (entityCode: string, subCode: string, ticketCode: string) =>
  `${entityCode}${subCode}${ticketCode}`

export const loanRefCode = (entityCode: string, subCode: string, loanCode: string) =>
  `${entityCode}${subCode}${loanCode}`
