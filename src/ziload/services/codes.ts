// ZiLoad — code generation helpers
import { nextYearCode } from '@/ziorbitcore/services/codes'

export const nextLoadCode    = () => nextYearCode('LD')   // LD26A01
export const nextTruckCode   = () => nextYearCode('TP')   // TP26A01 (truck posting)
export const nextBookingCode = () => nextYearCode('BK')   // BK26A01
