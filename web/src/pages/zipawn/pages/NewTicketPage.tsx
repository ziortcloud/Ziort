// New Loan Ticket — 5-step wizard
// API flow: POST /tickets → POST items → POST valuations → POST /disburse
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, AlertCircle } from 'lucide-react'
import {
  useCustomers, useSchemes, useGoldRates, useEntityBranches,
  useCreateTicket, useAddTicketItem, useAddTicketValuation, useDisburseTicket,
} from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const STEPS = ['Customer', 'Scheme', 'Items', 'Terms', 'Review']

const METAL_TYPES = ['Gold', 'Silver', 'Platinum', 'Diamond']
const GOLD_PURITY  = ['24K (99.9%)', '22K (91.6%)', '18K (75%)', '14K (58.3%)']
const SILVER_PURITY = ['99.9%', '95.8%', '92.5%']
const ITEM_TYPES   = ['Ring', 'Necklace', 'Chain', 'Bracelet', 'Bangle', 'Earrings', 'Pendant', 'Coin/Bar', 'Other']
const PAYMENT_MODES = [
  { value: 'cash',          label: 'Cash'          },
  { value: 'bank_transfer', label: 'Bank Transfer'  },
  { value: 'upi',           label: 'UPI'            },
  { value: 'cheque',        label: 'Cheque'         },
]

const PURITY_FACTOR: Record<string, number> = {
  '24K (99.9%)': 0.999, '22K (91.6%)': 0.916, '18K (75%)': 0.75, '14K (58.3%)': 0.583,
  '99.9%': 0.999, '95.8%': 0.958, '92.5%': 0.925,
}
const METAL_TO_CATEGORY: Record<string, string> = {
  Gold: 'gold', Silver: 'silver', Platinum: 'platinum', Diamond: 'diamond',
}

interface PawnItem {
  item_type: string; metal_type: string; purity: string
  gross_weight_g: string; net_weight_g: string; appraised_value: string; notes: string
}

function newItem(): PawnItem {
  return { item_type: 'Ring', metal_type: 'Gold', purity: '22K (91.6%)', gross_weight_g: '', net_weight_g: '', appraised_value: '', notes: '' }
}

export default function NewTicketPage({ entityId, subscriptionId }: Props) {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const [step, setStep]  = useState(0)
  const [customerId, setCustomerId]   = useState<string | null>(searchParams.get('customer'))
  const [schemeId, setSchemeId]       = useState<string | null>(null)
  const [branchId, setBranchId]       = useState<string | null>(null)
  const [items, setItems]             = useState<PawnItem[]>([newItem()])
  const [terms, setTerms]             = useState({
    principal_rupees: '', tenure_days: 90, payment_mode: 'cash',
    interest_rate_pm: '', interest_basis: 'daily' as 'daily' | 'monthly',
  })
  const [saving, setSaving]           = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const { data: customersData } = useCustomers(entityId, subscriptionId, { search: customerSearch || undefined, limit: 30 })
  const { data: schemesData }   = useSchemes(entityId, subscriptionId)
  const { data: goldRates }     = useGoldRates(entityId, subscriptionId)
  const { data: branches = [] } = useEntityBranches(entityId)

  const createTicket   = useCreateTicket(entityId, subscriptionId)
  const addItem        = useAddTicketItem(entityId, subscriptionId)
  const addValuation   = useAddTicketValuation(entityId, subscriptionId)
  const disburseTicket = useDisburseTicket(entityId, subscriptionId)

  const customers        = customersData?.data ?? []
  const schemes          = schemesData?.data   ?? []
  const selectedCustomer = customers.find((c: any) => c.id === customerId)
  const selectedScheme   = schemes.find((s: any) => s.id === schemeId)
  const effectiveBranchId = branchId ?? (branches.length === 1 ? (branches[0] as any).id : null)
  const selectedBranch    = (branches as any[]).find((b: any) => b.id === effectiveBranchId)

  const goldRatePerGram = goldRates?.gold_22k_per_gram_paise ? goldRates.gold_22k_per_gram_paise / 100 : 0

  function calcAppraisedValue(item: PawnItem): number {
    const netG   = parseFloat(item.net_weight_g) || parseFloat(item.gross_weight_g) * 0.95 || 0
    const factor = PURITY_FACTOR[item.purity] || 0.916
    if (item.metal_type === 'Gold')   return Math.round(netG * factor * goldRatePerGram)
    if (item.metal_type === 'Silver') return Math.round(netG * factor * (goldRates?.silver_per_gram_paise ? goldRates.silver_per_gram_paise / 100 : 0))
    return 0
  }

  function getMetalPricePaise(item: PawnItem): number | undefined {
    if (item.metal_type === 'Gold') {
      if (item.purity.startsWith('24K')) return goldRates?.gold_24k_per_gram_paise
      if (item.purity.startsWith('22K')) return goldRates?.gold_22k_per_gram_paise
      if (item.purity.startsWith('18K')) return goldRates?.gold_18k_per_gram_paise
      return goldRates?.gold_22k_per_gram_paise
    }
    if (item.metal_type === 'Silver') return goldRates?.silver_per_gram_paise
    return undefined
  }

  function updateItem(i: number, patch: Partial<PawnItem>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }

  const totalAppraised = items.reduce((s, it) => s + (parseFloat(it.appraised_value) || calcAppraisedValue(it)), 0)
  const ltvPct  = selectedScheme?.ltv_gold_916 ?? 75
  const maxLoan = Math.floor(totalAppraised * (ltvPct / 100))

  async function disburse() {
    const principalRupees = parseFloat(terms.principal_rupees)
    if (!principalRupees || principalRupees <= 0) { toast.error('Enter loan amount'); return }

    const interestRate = selectedScheme?.interest_rate_pm ?? parseFloat(terms.interest_rate_pm)
    if (!interestRate || interestRate <= 0 || interestRate > 10) {
      toast.error('Interest rate must be between 0.01 and 10% per month')
      return
    }
    if (!effectiveBranchId) { toast.error('Select a branch'); return }
    if (!customerId)         { toast.error('Select a customer'); return }

    setSaving(true)
    try {
      // 1. Create ticket
      const ticket = await createTicket.mutateAsync({
        customer_id: customerId,
        branch_id:   effectiveBranchId,
        scheme_id:   schemeId ?? undefined,
      }) as any

      const ticketId: string = ticket.id

      // 2. Add items + valuations sequentially
      for (const item of items) {
        const descParts = [item.purity, item.item_type]
        if (item.notes) descParts.push(item.notes)

        const addedItem = await addItem.mutateAsync({
          ticketId,
          body: {
            category:     METAL_TO_CATEGORY[item.metal_type] ?? 'other',
            description:  descParts.join(' — '),
            purity:       item.purity,
            weight_grams: parseFloat(item.gross_weight_g) || undefined,
            item_photos:  [],
          },
        }) as any

        const appraisedRupees = parseFloat(item.appraised_value) || calcAppraisedValue(item)
        await addValuation.mutateAsync({
          ticketId,
          body: {
            item_id:                    addedItem.id,
            gross_value_paise:          Math.round(appraisedRupees * 100),
            deduction_pct:              0,
            metal_price_per_gram_paise: getMetalPricePaise(item),
          },
        })
      }

      // 3. Disburse
      const result = await disburseTicket.mutateAsync({
        ticketId,
        body: {
          sanctioned_paise:  Math.round(principalRupees * 100),
          interest_rate_pm:  interestRate,
          interest_basis:    terms.interest_basis,
          tenure_days:       terms.tenure_days,
          disbursement_mode: terms.payment_mode,
        },
      }) as any

      toast.success('Loan disbursed successfully!')
      navigate(`/zipawn/loans/${result?.loan?.id ?? ''}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Disbursement failed')
    } finally {
      setSaving(false)
    }
  }

  const interestRateValid = selectedScheme?.interest_rate_pm
    ? true
    : !!terms.interest_rate_pm && parseFloat(terms.interest_rate_pm) > 0 && parseFloat(terms.interest_rate_pm) <= 10

  const canNext = [
    !!customerId,
    true,
    items.length > 0 && items.every(it => it.gross_weight_g || it.appraised_value),
    !!terms.principal_rupees && !!terms.tenure_days && !!effectiveBranchId && interestRateValid,
    true,
  ]

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold text-zi-white">New Loan Ticket</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button onClick={() => i < step && setStep(i)}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 transition-colors
                ${i < step   ? 'bg-zi-blue text-white cursor-pointer'
                : i === step ? 'bg-zi-blue/20 border-2 border-zi-blue text-zi-blue'
                :               'bg-orbit-navy border border-white/10 text-zi-muted cursor-default'}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < step ? 'bg-zi-blue' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-zi-blue mb-6">{STEPS[step]}</p>

      {/* ── Step 0: Customer ── */}
      {step === 0 && (
        <div className="space-y-3">
          <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
            placeholder="Search by name or mobile…"
            className="w-full px-3 py-2.5 bg-orbit-deep border border-white/5 rounded-lg text-sm text-zi-white
                       placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/30 transition-colors" />
          {customers.length === 0 && customerSearch && (
            <p className="text-sm text-zi-muted py-4 text-center">No customers found</p>
          )}
          {customers.length === 0 && !customerSearch && (
            <button onClick={() => navigate('/zipawn/customers/new')}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/15 hover:border-zi-cyan/30 rounded-xl text-sm text-zi-muted hover:text-zi-cyan transition-colors">
              <Plus size={14} /> Add New Customer
            </button>
          )}
          {customers.map((c: any) => (
            <button key={c.id} onClick={() => setCustomerId(c.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left
                ${customerId === c.id ? 'bg-zi-blue/10 border-zi-blue/30' : 'bg-orbit-deep border-white/5 hover:border-white/10'}`}>
              <div className="w-9 h-9 rounded-full bg-zi-blue/15 flex items-center justify-center text-sm font-bold text-zi-blue shrink-0">
                {c.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zi-white">{c.full_name}</p>
                <p className="text-xs text-zi-muted">{c.zi_code} · ****{c.mobile_last4}</p>
              </div>
              {customerId === c.id && <Check size={14} className="text-zi-blue shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Step 1: Scheme ── */}
      {step === 1 && (
        <div className="space-y-3">
          <button onClick={() => setSchemeId(null)}
            className={`w-full p-4 rounded-xl border transition-colors text-left
              ${!schemeId ? 'bg-zi-blue/10 border-zi-blue/30' : 'bg-orbit-deep border-white/5 hover:border-white/10'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zi-white">Custom / No Scheme</p>
              {!schemeId && <Check size={14} className="text-zi-blue" />}
            </div>
            <p className="text-xs text-zi-muted mt-1">Set your own interest rate in the next step</p>
          </button>
          {schemes.map((s: any) => (
            <button key={s.id} onClick={() => setSchemeId(s.id)}
              className={`w-full p-4 rounded-xl border transition-colors text-left
                ${schemeId === s.id ? 'bg-zi-blue/10 border-zi-blue/30' : 'bg-orbit-deep border-white/5 hover:border-white/10'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zi-white">{s.scheme_name}</p>
                {schemeId === s.id && <Check size={14} className="text-zi-blue" />}
              </div>
              <div className="flex gap-3 mt-2 flex-wrap">
                <Chip label={`${s.interest_rate_pm}% / month`} />
                <Chip label={`LTV ${s.ltv_gold_916 ?? 75}%`} />
                <Chip label={`Up to ${s.max_tenure_days}d`} />
              </div>
            </button>
          ))}
          {schemes.length === 0 && (
            <p className="text-xs text-zi-muted py-2 text-center">No schemes yet — you'll set a custom rate in Terms</p>
          )}
        </div>
      )}

      {/* ── Step 2: Items ── */}
      {step === 2 && (
        <div className="space-y-4">
          {goldRatePerGram > 0 && (
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-xs text-amber-400">Live gold rate: ₹{goldRatePerGram.toLocaleString('en-IN')}/g (22K)</span>
            </div>
          )}
          {items.map((item, i) => (
            <div key={i} className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted">Item {i + 1}</p>
                {items.length > 1 && (
                  <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-zi-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Item Type" value={item.item_type} options={ITEM_TYPES}
                  onChange={v => updateItem(i, { item_type: v })} />
                <Sel label="Metal" value={item.metal_type} options={METAL_TYPES}
                  onChange={v => updateItem(i, { metal_type: v, purity: v === 'Gold' ? '22K (91.6%)' : '99.9%' })} />
                <Sel label="Purity" value={item.purity}
                  options={item.metal_type === 'Silver' ? SILVER_PURITY : GOLD_PURITY}
                  onChange={v => updateItem(i, { purity: v })} />
                <Num label="Gross Weight (g)" value={item.gross_weight_g} step="0.01"
                  onChange={v => updateItem(i, { gross_weight_g: v })}
                  onBlur={() => {
                    const val = calcAppraisedValue(item)
                    if (val > 0 && !item.appraised_value) updateItem(i, { appraised_value: String(val) })
                  }} />
                <Num label="Net Weight (g)" value={item.net_weight_g} step="0.01"
                  placeholder={item.gross_weight_g ? String(Math.round(parseFloat(item.gross_weight_g) * 95) / 100) : ''}
                  onChange={v => updateItem(i, { net_weight_g: v })} />
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Appraised Value (₹)</label>
                  <div className="flex gap-1">
                    <input type="number" value={item.appraised_value}
                      onChange={e => updateItem(i, { appraised_value: e.target.value })}
                      placeholder={String(calcAppraisedValue(item) || '')}
                      className="flex-1 px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-zi-cyan/40 transition-colors" />
                    {calcAppraisedValue(item) > 0 && (
                      <button onClick={() => updateItem(i, { appraised_value: String(calcAppraisedValue(item)) })}
                        className="px-2.5 bg-orbit-navy border border-white/8 rounded-lg text-[10px] text-zi-muted hover:text-zi-cyan transition-colors">
                        Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <Txt label="Notes (optional)" value={item.notes} placeholder="e.g. 1 gold ring with stone"
                onChange={v => updateItem(i, { notes: v })} />
            </div>
          ))}
          <button onClick={() => setItems(prev => [...prev, newItem()])}
            className="flex items-center gap-2 px-4 py-2.5 w-full justify-center bg-orbit-deep border border-dashed border-white/15 hover:border-zi-cyan/30 rounded-xl text-sm text-zi-muted hover:text-zi-cyan transition-colors">
            <Plus size={14} /> Add Another Item
          </button>
          {totalAppraised > 0 && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-zi-muted mb-1">Total Appraised Value</p>
              <p className="text-xl font-bold text-emerald-400">₹{totalAppraised.toLocaleString('en-IN')}</p>
              {maxLoan > 0 && <p className="text-xs text-zi-muted mt-1">Max loan @ {ltvPct}% LTV: ₹{maxLoan.toLocaleString('en-IN')}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Terms ── */}
      {step === 3 && (
        <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
          {/* Branch */}
          {branches.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">No branches configured. Add a branch in Settings → Branches first.</p>
            </div>
          )}
          {(branches as any[]).length > 1 && (
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Branch *</label>
              <select value={branchId ?? ''} onChange={e => setBranchId(e.target.value || null)}
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors">
                <option value="">Select branch…</option>
                {(branches as any[]).map(b => <option key={b.id} value={b.id}>{b.name || b.branch_name}</option>)}
              </select>
            </div>
          )}

          {/* Loan amount */}
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Loan Amount (₹) *</label>
            <input type="number" value={terms.principal_rupees}
              onChange={e => setTerms(t => ({ ...t, principal_rupees: e.target.value }))}
              placeholder={maxLoan > 0 ? `Max ₹${maxLoan.toLocaleString('en-IN')}` : 'Enter amount'}
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-zi-cyan/40 transition-colors" />
            {maxLoan > 0 && (
              <button onClick={() => setTerms(t => ({ ...t, principal_rupees: String(maxLoan) }))}
                className="mt-1.5 text-[11px] text-zi-cyan hover:underline">
                Use max (₹{maxLoan.toLocaleString('en-IN')})
              </button>
            )}
          </div>

          {/* Interest rate — only when no scheme */}
          {!selectedScheme ? (
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Interest Rate (% / month) *</label>
              <input type="number" step="0.01" min="0.01" max="10" value={terms.interest_rate_pm}
                onChange={e => setTerms(t => ({ ...t, interest_rate_pm: e.target.value }))}
                placeholder="e.g. 1.5"
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-zi-cyan/40 transition-colors" />
              <p className="text-[10px] text-zi-muted mt-1">Max 10% per month</p>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg">
              <span className="text-[11px] text-zi-muted uppercase tracking-wider">Interest Rate</span>
              <span className="text-sm font-semibold text-zi-white">{selectedScheme.interest_rate_pm}% / month</span>
            </div>
          )}

          {/* Tenure */}
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Tenure (days)</label>
            <div className="flex gap-2 mb-2">
              {[30, 60, 90, 180].map(d => (
                <button key={d} onClick={() => setTerms(t => ({ ...t, tenure_days: d }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    ${terms.tenure_days === d ? 'bg-zi-blue text-white' : 'bg-orbit-navy border border-white/8 text-zi-muted hover:text-zi-white'}`}>
                  {d}d
                </button>
              ))}
            </div>
            <input type="number" value={terms.tenure_days} min="1" max="730"
              onChange={e => setTerms(t => ({ ...t, tenure_days: parseInt(e.target.value) || 90 }))}
              className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
          </div>

          {/* Disbursement mode */}
          <div>
            <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Disbursement Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m.value} onClick={() => setTerms(t => ({ ...t, payment_mode: m.value }))}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors
                    ${terms.payment_mode === m.value ? 'bg-zi-blue text-white' : 'bg-orbit-navy border border-white/8 text-zi-muted hover:text-zi-white'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Review ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted mb-4">Loan Summary</p>
            <Row label="Customer"       value={selectedCustomer?.full_name ?? '—'} />
            <Row label="Branch"         value={selectedBranch?.name || selectedBranch?.branch_name || '—'} />
            <Row label="Scheme"         value={selectedScheme?.scheme_name ?? 'Custom'} />
            <Row label="Interest Rate"  value={selectedScheme ? `${selectedScheme.interest_rate_pm}% / month` : `${terms.interest_rate_pm}% / month`} />
            <div className="border-t border-white/5 pt-3" />
            <Row label="Items"           value={`${items.length} item${items.length !== 1 ? 's' : ''}`} />
            <Row label="Total Appraised" value={`₹${totalAppraised.toLocaleString('en-IN')}`} />
            <div className="border-t border-white/5 pt-3" />
            <Row label="Loan Amount"    value={`₹${parseFloat(terms.principal_rupees || '0').toLocaleString('en-IN')}`} />
            <Row label="Tenure"         value={`${terms.tenure_days} days`} />
            <Row label="Disbursement"   value={PAYMENT_MODES.find(m => m.value === terms.payment_mode)?.label ?? terms.payment_mode} />
          </div>
          <p className="text-xs text-zi-muted">Clicking Disburse will create the pawn ticket and release the loan amount to the customer.</p>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="px-4 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Back
          </button>
        )}
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zi-blue hover:bg-zi-blue/90
                       disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors">
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={disburse} disabled={saving || (branches as any[]).length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-600/90
                       disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Disburse Loan'
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ── Small form primitives ──────────────────────────────────────────────────────
const INPUT_CLS = 'w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-zi-cyan/40 transition-colors'

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={INPUT_CLS}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
function Num({ label, value, step, placeholder, onChange, onBlur }: { label: string; value: string; step?: string; placeholder?: string; onChange: (v: string) => void; onBlur?: () => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input type="number" step={step} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} className={INPUT_CLS} />
    </div>
  )
}
function Txt({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={INPUT_CLS} />
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-zi-muted">{label}</span>
      <span className="text-sm font-medium text-zi-white">{value}</span>
    </div>
  )
}
function Chip({ label }: { label: string }) {
  return <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zi-muted">{label}</span>
}
