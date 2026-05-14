// ZiPulse — Business Relationship OS code helpers
import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextContactCode  = () => nextCode('CST')         // CSTA01
export const nextTagCode      = () => nextCode('TAG')         // TAGA01
export const nextThreadCode   = () => nextYearCode('THR')     // THR26A01
export const nextPromiseCode  = () => nextYearCode('PRM')     // PRM26A01
export const nextEnquiryCode  = () => nextYearCode('ENQ')     // ENQ26A01
export const nextFollowupCode = () => nextYearCode('FUP')     // FUP26A01
export const nextMeetingCode  = () => nextYearCode('MTG')     // MTG26A01

export function contactRefCode(entityCode: string, subCode: string, contactCode: string) {
  return `${entityCode}${subCode}${contactCode}`
}
export function threadRefCode(entityCode: string, subCode: string, contactCode: string, threadCode: string) {
  return `${entityCode}${subCode}${contactCode}${threadCode}`
}
export function promiseRefCode(entityCode: string, subCode: string, contactCode: string, promiseCode: string) {
  return `${entityCode}${subCode}${contactCode}${promiseCode}`
}
export function followupRefCode(entityCode: string, subCode: string, contactCode: string, fupCode: string) {
  return `${entityCode}${subCode}${contactCode}${fupCode}`
}
export function enquiryRefCode(entityCode: string, subCode: string, enqCode: string) {
  return `${entityCode}${subCode}${enqCode}`
}
export function meetingRefCode(entityCode: string, subCode: string, mtgCode: string) {
  return `${entityCode}${subCode}${mtgCode}`
}
