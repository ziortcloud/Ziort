// Shared document-total recalculation helper.
// Called after every item insert / update / delete on a quote or invoice.
import { db } from '@/ziorbitcore/db/client'
import { calcLineItem, calcTotals } from './gst'
import { amountInWords } from './amount-words'

// ─── ZiCalc sheet totals ──────────────────────────────────────
export async function recalcSheetTotals(sheetId: string): Promise<void> {
  const [{ data: sheet }, { data: items }] = await Promise.all([
    db.from('zclc_sheets').select('margin_pct').eq('id', sheetId).single(),
    db.from('zclc_items').select('qty,rate_paise').eq('sheet_id', sheetId),
  ])

  const margin_pct     = sheet?.margin_pct ?? 20
  const subtotal       = (items ?? []).reduce(
    (acc, i) => acc + Math.round(i.qty * i.rate_paise), 0
  )
  const selling_price  = Math.round(subtotal * (1 + margin_pct / 100))
  const profit         = selling_price - subtotal

  await db.from('zclc_sheets').update({
    subtotal_paise:      subtotal,
    selling_price_paise: selling_price,
    profit_paise:        profit,
    updated_at:          new Date().toISOString(),
  }).eq('id', sheetId)
}

// ─── ZiQuote totals ───────────────────────────────────────────
export async function recalcQuoteTotals(quoteId: string): Promise<void> {
  const [{ data: doc }, { data: items }] = await Promise.all([
    db.from('zqt_quotes').select('supply_type').eq('id', quoteId).single(),
    db.from('zqt_items')
      .select('qty,rate_paise,discount_pct,gst_rate_pct')
      .eq('quote_id', quoteId),
  ])

  const isInterstate = doc?.supply_type === 'INTERSTATE'
  const computed     = (items ?? []).map(i => calcLineItem({
    qty:           Number(i.qty),
    rate_paise:    i.rate_paise,
    discount_pct:  Number(i.discount_pct ?? 0),
    gst_rate_pct:  Number(i.gst_rate_pct ?? 0),
    is_interstate: isInterstate,
  }))
  const totals = calcTotals(computed)

  await db.from('zqt_quotes').update({
    ...totals,
    amount_words: amountInWords(totals.grand_total_paise),
    updated_at:   new Date().toISOString(),
  }).eq('id', quoteId)
}

// ─── ZiInvoice totals ─────────────────────────────────────────
export async function recalcInvoiceTotals(invoiceId: string): Promise<void> {
  const [{ data: doc }, { data: items }] = await Promise.all([
    db.from('znvc_invoices').select('supply_type').eq('id', invoiceId).single(),
    db.from('znvc_items')
      .select('qty,rate_paise,discount_pct,gst_rate_pct')
      .eq('invoice_id', invoiceId),
  ])

  const isInterstate = doc?.supply_type === 'INTERSTATE'
  const computed     = (items ?? []).map(i => calcLineItem({
    qty:           Number(i.qty),
    rate_paise:    i.rate_paise,
    discount_pct:  Number(i.discount_pct ?? 0),
    gst_rate_pct:  Number(i.gst_rate_pct ?? 0),
    is_interstate: isInterstate,
  }))
  const totals = calcTotals(computed)

  await db.from('znvc_invoices').update({
    ...totals,
    amount_due_paise: totals.grand_total_paise,   // reset; trigger adjusts after payments
    amount_words:     amountInWords(totals.grand_total_paise),
    updated_at:       new Date().toISOString(),
  }).eq('id', invoiceId)
}
