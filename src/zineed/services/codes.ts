// ZiNeed transaction code helpers — all year-scoped
import { nextYearCode } from '@/ziorbitcore/services/codes'

export const nextRequirementCode = () => nextYearCode('REQ')  // REQ26A01
export const nextProposalCode    = () => nextYearCode('PRO')  // PRO26A01
export const nextDealCode        = () => nextYearCode('DL')   // DL26A01
export const nextEscalationCode  = () => nextYearCode('ESC')  // ESC26A01
export const nextCompletionCode  = () => nextYearCode('COM')  // COM26A01
export const nextRatingCode      = () => nextYearCode('RTG')  // RTG26A01
export const nextDisputeCode     = () => nextYearCode('DSP')  // DSP26A01

export function requirementRefCode(entityCode: string, subCode: string, reqCode: string) {
  return `${entityCode}${subCode}${reqCode}`
}

export function dealRefCode(buyerEntityCode: string, subCode: string, dealCode: string) {
  return `${buyerEntityCode}${subCode}${dealCode}`
}
