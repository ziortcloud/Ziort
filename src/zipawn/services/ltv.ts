// ZiPawn — LTV (Loan-to-Value) calculation engine
// LTV % applied to net appraised value to get max eligible loan amount.

export interface SchemeRates {
  ltv_gold_916: number
  ltv_gold_999: number
  ltv_silver:   number
  ltv_other:    number
}

const GOLD_916_PURITIES = ['916','22k','22K','hallmark_916']
const GOLD_999_PURITIES = ['999','24k','24K','999.9']
const SILVER_PURITIES   = ['silver','sterling_925','925']

export function getLtvPct(
  category: string,
  purity: string | null | undefined,
  scheme: SchemeRates,
): number {
  const p = (purity ?? '').toLowerCase().replace(/\s/g, '')
  if (category === 'gold') {
    if (GOLD_999_PURITIES.some(x => x.toLowerCase() === p)) return scheme.ltv_gold_999
    if (GOLD_916_PURITIES.some(x => x.toLowerCase() === p)) return scheme.ltv_gold_916
    return scheme.ltv_gold_916  // default gold LTV for unknown purity
  }
  if (category === 'silver') return scheme.ltv_silver
  if (category === 'platinum') return scheme.ltv_gold_999   // treat platinum as pure
  return scheme.ltv_other
}

/**
 * Calculate valuation figures for a single item.
 * Returns gross, net (after deduction), and max_loan amounts.
 */
export function calcItemValuation(opts: {
  category:                   string
  purity?:                    string
  weight_grams:               number
  metal_price_per_gram_paise: number   // ₹/gram × 100
  deduction_pct:              number   // wastage/making charge deduction %
  scheme:                     SchemeRates
}): {
  gross_value_paise: number
  net_value_paise:   number
  max_loan_paise:    number
  ltv_pct:           number
} {
  const gross = Math.round(opts.weight_grams * opts.metal_price_per_gram_paise)
  const net   = Math.round(gross * (1 - opts.deduction_pct / 100))
  const ltv   = getLtvPct(opts.category, opts.purity, opts.scheme)
  const max   = Math.floor(net * ltv / 100)
  return { gross_value_paise: gross, net_value_paise: net, max_loan_paise: max, ltv_pct: ltv }
}

/**
 * Calculate processing fee from scheme config.
 */
export function calcProcessingFee(opts: {
  sanctioned_paise:     number
  fee_type:             'percentage' | 'fixed'
  fee_value:            number
  fee_max_paise?:       number | null
}): number {
  let fee = 0
  if (opts.fee_type === 'fixed') {
    fee = Math.round(opts.fee_value * 100)  // fee_value stored in rupees
  } else {
    fee = Math.round(opts.sanctioned_paise * opts.fee_value / 100)
  }
  if (opts.fee_max_paise != null) fee = Math.min(fee, opts.fee_max_paise)
  return fee
}
