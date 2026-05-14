import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextPartnerCode = () => nextCode('PTN')     // PTNA01
export const nextPayoutCode  = () => nextYearCode('PYOT')// PYOT26A01

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
