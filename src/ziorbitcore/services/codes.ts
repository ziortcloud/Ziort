// Ziort Core — Business Code Generator
// Alpha-Grow: A01→A99→B01→Z99→AA01→AA99→AAA01...
// All codes generated SERVER-SIDE ONLY via Postgres fn_next_code().
import { db } from '../db/client'
import type { ContactType } from '../types/core'

// ---- Core generation (calls Postgres function) -------------

export async function nextCode(prefix: string): Promise<string> {
  const { data, error } = await db.rpc('fn_next_code', { prefix })
  if (error) throw new Error(`Code generation failed [${prefix}]: ${error.message}`)
  return data as string
}

export async function nextYearCode(prefix: string, year2digit?: number): Promise<string> {
  const yr = year2digit ?? new Date().getFullYear() % 100
  const { data, error } = await db.rpc('fn_next_year_code', { prefix, year_2digit: yr })
  if (error) throw new Error(`Year code generation failed [${prefix}${yr}]: ${error.message}`)
  return data as string
}

// ---- Typed helpers -----------------------------------------
export const nextIndividualCode    = ()                          => nextCode('ZU')
export const nextEntityCode        = ()                          => nextCode('ZE')
export const nextBranchCode        = ()                          => nextCode('ZBR')
export const nextSubscriptionCode  = (productPrefix: string)     => nextCode(productPrefix)
export const nextContactCode       = (contactType: ContactType)  => nextCode(contactType)
export const nextTxCode            = (prefix: string)            => nextYearCode(prefix)

// ---- Reference code builders (pure, no DB) -----------------

/** ZEA01 + ZUA01 → ZEA01ZUA01 (membership ref) */
export const membershipRefCode     = (entityCode: string, individualCode: string) =>
  `${entityCode}${individualCode}`

/** ZEA01 + ZBRA01 → ZEA01ZBRA01 */
export const branchRefCode         = (entityCode: string, branchCode: string) =>
  `${entityCode}${branchCode}`

/** ZEA01 + ZPNA01 → ZEA01ZPNA01 */
export const subscriptionRefCode   = (entityCode: string, subscriptionCode: string) =>
  `${entityCode}${subscriptionCode}`

/** ZEA01 + ZPNA01 + CSTA01 → ZEA01ZPNA01CSTA01 */
export const contactRefCode        = (entityCode: string, subCode: string, contactCode: string) =>
  `${entityCode}${subCode}${contactCode}`

/** ZEA01 + ZPNA01 + LN26A01 → ZEA01ZPNA01LN26A01 */
export const txRefCode             = (entityCode: string, subCode: string, txCode: string) =>
  `${entityCode}${subCode}${txCode}`

/** ZEA01ZPNA01LN26A01 + PAY26A01 → ZEA01ZPNA01LN26A01PAY26A01 */
export const childTxRefCode        = (parentRef: string, childTxCode: string) =>
  `${parentRef}${childTxCode}`

// ---- Validation --------------------------------------------

export function isValidBusinessCode(code: string, prefix: string): boolean {
  return new RegExp(`^${prefix}[A-Z]+[0-9]{2}$`).test(code)
}

export function isYearScopedCode(code: string): boolean {
  return /[A-Z]{2,4}[0-9]{2}[A-Z]+[0-9]{2}$/.test(code)
}
