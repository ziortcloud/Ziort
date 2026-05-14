import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextOrderCode    = () => nextYearCode('ORD')   // ORD26A01
export const nextKotCode      = () => nextYearCode('KOT')   // KOT26A01
export const nextMenuItemCode = () => nextCode('FMI')        // FMIA01
