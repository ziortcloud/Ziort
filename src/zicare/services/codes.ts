// ZiCare transaction code helpers
import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextPatientCode     = () => nextCode('CST')         // CSTA01 (contact prefix)
export const nextDoctorCode      = () => nextCode('DOC')         // DOCA01
export const nextAppointmentCode = () => nextYearCode('APT')     // APT26A01
export const nextCareEnquiryCode = () => nextYearCode('CENQ')    // CENQ26A01

export function patientRefCode(entityCode: string, subCode: string, patCode: string) {
  return `${entityCode}${subCode}${patCode}`
}
export function appointmentRefCode(entityCode: string, subCode: string, apptCode: string) {
  return `${entityCode}${subCode}${apptCode}`
}
export function enquiryRefCode(entityCode: string, subCode: string, enqCode: string) {
  return `${entityCode}${subCode}${enqCode}`
}
