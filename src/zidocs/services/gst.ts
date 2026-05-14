// Shared GST computation engine for ZiCalc, ZiQuote, ZiInvoice, ZiReceipt
// All amounts in paise. Rounding: Math.round to nearest paise.

export interface LineItemInput {
  qty:           number
  rate_paise:    number
  discount_pct:  number   // 0–100
  gst_rate_pct:  number   // 0, 5, 12, 18, 28 etc.
  is_interstate: boolean  // true → IGST; false → CGST+SGST split
}

export interface LineItemResult {
  gross_amount_paise:   number
  discount_paise:       number
  taxable_amount_paise: number
  cgst_paise:           number
  sgst_paise:           number
  igst_paise:           number
  total_paise:          number
}

export function calcLineItem(input: LineItemInput): LineItemResult {
  const gross    = Math.round(input.qty * input.rate_paise)
  const disc     = Math.round(gross * (input.discount_pct / 100))
  const taxable  = gross - disc
  const gst      = Math.round(taxable * (input.gst_rate_pct / 100))
  const cgst     = input.is_interstate ? 0 : Math.round(gst / 2)
  const sgst     = input.is_interstate ? 0 : gst - cgst   // avoids double-rounding loss
  const igst     = input.is_interstate ? gst : 0

  return {
    gross_amount_paise:   gross,
    discount_paise:       disc,
    taxable_amount_paise: taxable,
    cgst_paise:           cgst,
    sgst_paise:           sgst,
    igst_paise:           igst,
    total_paise:          taxable + gst,
  }
}

export interface DocTotals {
  subtotal_paise:       number
  total_discount_paise: number
  total_cgst_paise:     number
  total_sgst_paise:     number
  total_igst_paise:     number
  total_gst_paise:      number
  grand_total_paise:    number
}

const ZERO_TOTALS: DocTotals = {
  subtotal_paise:       0,
  total_discount_paise: 0,
  total_cgst_paise:     0,
  total_sgst_paise:     0,
  total_igst_paise:     0,
  total_gst_paise:      0,
  grand_total_paise:    0,
}

export function calcTotals(items: LineItemResult[]): DocTotals {
  return items.reduce<DocTotals>((acc, it) => ({
    subtotal_paise:       acc.subtotal_paise       + it.taxable_amount_paise,
    total_discount_paise: acc.total_discount_paise + it.discount_paise,
    total_cgst_paise:     acc.total_cgst_paise     + it.cgst_paise,
    total_sgst_paise:     acc.total_sgst_paise     + it.sgst_paise,
    total_igst_paise:     acc.total_igst_paise     + it.igst_paise,
    total_gst_paise:      acc.total_gst_paise      + it.cgst_paise + it.sgst_paise + it.igst_paise,
    grand_total_paise:    acc.grand_total_paise    + it.total_paise,
  }), { ...ZERO_TOTALS })
}
