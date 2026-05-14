import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextBillCode     = () => nextYearCode('BILL')  // BILL26A01
export const nextProductCode  = () => nextCode('ZSHP')      // ZSHPA01
export const nextCategoryCode = () => nextCode('ZSHC')      // ZSHCA01
