import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextFarmCode  = () => nextCode('FRM')       // FRMA01
export const nextCropCode  = () => nextCode('CRP')       // CRPA01
export const nextSaleCode  = () => nextYearCode('PRDS')  // PRDS26A01
