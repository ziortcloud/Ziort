// This endpoint has been superseded.
// Use POST /loans/:loanId/close  for loan closure and settlement
// Use POST /loans/:loanId/renew  for tenure extension, topup, refinance
import { gone } from '@/ziorbitcore/api/response'

export const PATCH = () => gone('This endpoint is removed. Use /close or /renew instead.')
export const GET   = () => gone('This endpoint is removed. Use /close or /renew instead.')
