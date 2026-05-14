import { nextCode, nextYearCode } from '@/ziorbitcore/services/codes'

export const nextVoucherCode = () => nextYearCode('VCH')   // VCH26A01
export const nextAccountCode = (entityId: string, seq: number) =>
  `ACC${String(seq).padStart(3, '0')}`                      // ACC001 (entity-scoped, caller manages seq)
