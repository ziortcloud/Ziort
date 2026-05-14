'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Gem, IndianRupee, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, Plus,
  Trash2, AlertCircle, Banknote, Smartphone, CreditCard,
} from 'lucide-react'
import { useSchemes, useCustomers, useCreateTicket, useDisburseTicket, useZiPawnSub } from '../hooks/use-zipawn'
import { fmtPaise } from '../lib/fmt'

const STEPS = [
  { id: 1, label: 'Customer',  icon: User },
  { id: 2, label: 'Scheme',    icon: Gem },
  { id: 3, label: 'Items',     icon: Gem },
  { id: 4, label: 'Disburse',  icon: IndianRupee },
  { id: 5, label: 'Done',      icon: CheckCircle2 },
]

type Item = {
  category: string; description: string
  weight_grams: string; purity: string
  appraised_value_rupees: string; market_value_rupees: string
}

const ITEM_CATEGORIES = [
  'gold', 'silver', 'diamond', 'electronics', 'vehicle', 'property_doc', 'other'
]
const DISBURSE_MODES = ['cash', 'upi', 'neft', 'rtgs', 'cheque']

export default function NewTicketPage() {
  const router      = useRouter()
  const { entityId, subscriptionId, sub } = useZiPawnSub()
  const { data: schemes = [] }   = useSchemes()
  const createTicket = useCreateTicket()
  const [step,    setStep]    = useState(1)
  const [ticketId, setTicketId] = useState('')
  const [loanId,   setLoanId]   = useState('')
  const [error,    setError]    = useState('')

  // Step 1 — Customer
  const [customerSearch, setCustomerSearch] = useState('')
  const { data: customers = [] } = useCustomers(customerSearch)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  // Step 2 — Scheme
  const [selectedScheme, setSelectedScheme] = useState<any>(null)

  // Step 3 — Items
  const [items, setItems] = useState<Item[]>([blankItem()])
  const [addingItems, setAddingItems] = useState(false)

  // Step 4 — Disbursal
  const [sanctionedRupees, setSanctionedRupees] = useState('')
  const [interestRatePm,   setInterestRatePm]   = useState('')
  const [interestBasis,    setInterestBasis]     = useState('monthly_flat')
  const [tenureDays,       setTenureDays]        = useState('')
  const [disburseMode,     setDisburseMode]      = useState('cash')
  const [txnRef,           setTxnRef]            = useState('')
  const [disbursing,       setDisbursing]        = useState(false)
  const disburse = useDisburseTicket(ticketId)

  // Derived totals
  const totalAppraised = items.reduce((s, it) => s + (parseFloat(it.appraised_value_rupees) || 0), 0)
  const maxLtv         = selectedScheme?.max_ltv_pct
  const maxEligible    = maxLtv ? (totalAppraised * maxLtv) / 100 : totalAppraised

  if (!sub) {
    return (
      <div className="zi-card text-center py-16">
        <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
        <p className="text-zi-white font-medium">ZiPawn not activated</p>
      </div>
    )
  }

  // ─── Step Handlers ───────────────────────────────────────────────────────────

  const goToStep2 = () => {
    if (!selectedCustomer) { setError('Select a customer'); return }
    setError(''); setStep(2)
  }

  const goToStep3 = () => {
    setError(''); setStep(3)
  }

  const goToStep4 = async () => {
    if (items.every(it => !it.description)) { setError('Add at least one item'); return }
    setError('')
    setAddingItems(true)
    try {
      // Create ticket
      const t = await createTicket.mutateAsync({
        customer_id: selectedCustomer.id,
        branch_id:   sub.entity_id,  // fallback — branch selection can be added later
        scheme_id:   selectedScheme?.id ?? undefined,
      })
      setTicketId(t.id)

      // Add items to ticket
      await Promise.all(items.filter(it => it.description).map(it =>
        fetch(`/api/v1/entities/${entityId}/zipawn/${subscriptionId}/tickets/${t.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category:               it.category || 'other',
            description:            it.description,
            weight_grams:           parseFloat(it.weight_grams) || undefined,
            purity:                 it.purity || undefined,
            appraised_value_paise:  Math.round((parseFloat(it.appraised_value_rupees) || 0) * 100),
            market_value_paise:     Math.round((parseFloat(it.market_value_rupees) || 0) * 100),
          }),
        })
      ))

      // Pre-fill from scheme
      if (selectedScheme) {
        setInterestRatePm(String(selectedScheme.interest_rate_pm ?? ''))
        setInterestBasis(selectedScheme.interest_basis ?? 'monthly_flat')
        if (selectedScheme.max_tenure_days) setTenureDays(String(selectedScheme.max_tenure_days))
      }
      setStep(4)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create ticket')
    } finally {
      setAddingItems(false)
    }
  }

  const goToStep5 = async () => {
    const sp = parseFloat(sanctionedRupees)
    const ip = parseFloat(interestRatePm)
    const td = parseInt(tenureDays)
    if (!sp || !ip || !td) { setError('Fill all disbursal fields'); return }
    setError('')
    setDisbursing(true)
    try {
      const result = await disburse.mutateAsync({
        sanctioned_paise:  Math.round(sp * 100),
        interest_rate_pm:  ip,
        interest_basis:    interestBasis,
        tenure_days:       td,
        disbursement_mode: disburseMode,
        transaction_ref:   txnRef || undefined,
      })
      setLoanId(result.loan?.id ?? '')
      setStep(5)
    } catch (e: any) {
      setError(e.message ?? 'Disbursal failed')
    } finally {
      setDisbursing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                            transition-all
                            ${step === s.id
                              ? 'bg-zi-blue text-white'
                              : step > s.id
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-zi-muted'
                            }`}>
              <s.icon size={12} />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 transition-colors
                              ${step > s.id ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                        text-red-400 rounded-lg px-3 py-2.5 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Step 1: Customer ── */}
        {step === 1 && (
          <StepCard key="s1" title="Select Customer">
            <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search name or mobile last 4…" className="zi-input w-full mb-3" />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {customers.map((c: any) => (
                <button key={c.id} onClick={() => setSelectedCustomer(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left
                              transition-all
                              ${selectedCustomer?.id === c.id
                                ? 'border-zi-cyan bg-zi-cyan/10'
                                : 'border-white/10 hover:border-white/20'
                              }`}>
                  <div className="w-8 h-8 rounded-full bg-zi-blue/20 flex items-center justify-center
                                  font-display font-bold text-zi-cyan shrink-0">
                    {c.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-zi-white text-sm font-medium">{c.full_name}</p>
                    <p className="text-zi-muted text-xs">···{c.mobile_last4}</p>
                  </div>
                  {selectedCustomer?.id === c.id && (
                    <CheckCircle2 size={15} className="text-zi-cyan ml-auto" />
                  )}
                </button>
              ))}
              {customers.length === 0 && (
                <p className="text-zi-muted text-sm text-center py-6">
                  No customers found. <a href="/zipawn/customers/new" className="text-zi-cyan underline">Add one?</a>
                </p>
              )}
            </div>
            <NavButtons onNext={goToStep2} nextLabel="Next: Scheme" />
          </StepCard>
        )}

        {/* ── Step 2: Scheme ── */}
        {step === 2 && (
          <StepCard key="s2" title="Select Scheme (optional)">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              <button onClick={() => setSelectedScheme(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                            ${!selectedScheme ? 'border-zi-cyan bg-zi-cyan/10' : 'border-white/10 hover:border-white/20'}`}>
                <span className="text-zi-muted text-sm">No scheme — enter rates manually</span>
                {!selectedScheme && <CheckCircle2 size={14} className="text-zi-cyan ml-auto" />}
              </button>
              {schemes.map((s: any) => (
                <button key={s.id} onClick={() => setSelectedScheme(s)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                              ${selectedScheme?.id === s.id
                                ? 'border-zi-cyan bg-zi-cyan/10'
                                : 'border-white/10 hover:border-white/20'
                              }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-zi-white text-sm font-medium">{s.scheme_name}</p>
                    <p className="text-zi-muted text-xs">
                      {parseFloat(s.interest_rate_pm).toFixed(2)}%/mo
                      {s.max_ltv_pct ? ` · LTV ${s.max_ltv_pct}%` : ''}
                    </p>
                  </div>
                  {selectedScheme?.id === s.id && <CheckCircle2 size={14} className="text-zi-cyan" />}
                </button>
              ))}
            </div>
            <NavButtons onBack={() => setStep(1)} onNext={goToStep3} nextLabel="Next: Items" />
          </StepCard>
        )}

        {/* ── Step 3: Items ── */}
        {step === 3 && (
          <StepCard key="s3" title="Pledged Items">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="bg-orbit-midnight/50 rounded-lg p-3 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zi-muted text-xs font-medium">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-zi-muted hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zi-muted text-xs">Category</label>
                      <select value={item.category}
                        onChange={e => updateItem(idx, 'category', e.target.value, setItems)}
                        className="zi-input w-full mt-1 text-sm capitalize">
                        {ITEM_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-zi-muted text-xs">Description</label>
                      <input value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value, setItems)}
                        placeholder="e.g. Gold bangles" className="zi-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-zi-muted text-xs">Weight (g)</label>
                      <input value={item.weight_grams} type="number"
                        onChange={e => updateItem(idx, 'weight_grams', e.target.value, setItems)}
                        placeholder="0.0" className="zi-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-zi-muted text-xs">Purity</label>
                      <input value={item.purity}
                        onChange={e => updateItem(idx, 'purity', e.target.value, setItems)}
                        placeholder="e.g. 22K / 916" className="zi-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-zi-muted text-xs">Appraised (₹)</label>
                      <input value={item.appraised_value_rupees} type="number"
                        onChange={e => updateItem(idx, 'appraised_value_rupees', e.target.value, setItems)}
                        placeholder="0" className="zi-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-zi-muted text-xs">Market Value (₹)</label>
                      <input value={item.market_value_rupees} type="number"
                        onChange={e => updateItem(idx, 'market_value_rupees', e.target.value, setItems)}
                        placeholder="0" className="zi-input w-full mt-1 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setItems(prev => [...prev, blankItem()])}
              className="flex items-center gap-1.5 text-zi-cyan text-sm mt-2 hover:underline">
              <Plus size={13} /> Add Another Item
            </button>
            {totalAppraised > 0 && (
              <div className="mt-3 bg-orbit-midnight/60 rounded-lg px-4 py-3 flex justify-between">
                <span className="text-zi-muted text-sm">Total Appraised</span>
                <span className="text-zi-white font-bold font-display">₹{totalAppraised.toLocaleString('en-IN')}</span>
              </div>
            )}
            {maxLtv && totalAppraised > 0 && (
              <div className="px-4 py-2 flex justify-between">
                <span className="text-zi-muted text-xs">Max Eligible ({maxLtv}% LTV)</span>
                <span className="text-zi-cyan text-sm font-medium">₹{maxEligible.toLocaleString('en-IN')}</span>
              </div>
            )}
            <NavButtons
              onBack={() => setStep(2)}
              onNext={goToStep4}
              nextLabel={addingItems ? 'Creating…' : 'Next: Disburse'}
              loading={addingItems}
            />
          </StepCard>
        )}

        {/* ── Step 4: Disburse ── */}
        {step === 4 && (
          <StepCard key="s4" title="Loan Terms & Disbursal">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                    Sanction Amount (₹)
                  </label>
                  <input value={sanctionedRupees} type="number"
                    onChange={e => setSanctionedRupees(e.target.value)}
                    placeholder={maxEligible ? `Max ₹${maxEligible.toLocaleString('en-IN')}` : '0'}
                    className="zi-input w-full mt-1" autoFocus />
                </div>
                <div>
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                    Interest Rate (% / month)
                  </label>
                  <input value={interestRatePm} type="number" step="0.01"
                    onChange={e => setInterestRatePm(e.target.value)}
                    placeholder="e.g. 1.5" className="zi-input w-full mt-1" />
                </div>
                <div>
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                    Tenure (days)
                  </label>
                  <input value={tenureDays} type="number"
                    onChange={e => setTenureDays(e.target.value)}
                    placeholder="e.g. 180" className="zi-input w-full mt-1" />
                </div>
                <div>
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                    Interest Basis
                  </label>
                  <select value={interestBasis}
                    onChange={e => setInterestBasis(e.target.value)}
                    className="zi-input w-full mt-1">
                    <option value="monthly_flat">Monthly Flat</option>
                    <option value="daily_simple">Daily Simple</option>
                    <option value="daily_compound">Daily Compound</option>
                  </select>
                </div>
              </div>

              {/* Disbursement Mode */}
              <div>
                <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">Mode</label>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  {DISBURSE_MODES.map(m => (
                    <button key={m} type="button" onClick={() => setDisburseMode(m)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize
                                  transition-all
                                  ${disburseMode === m
                                    ? 'border-zi-cyan bg-zi-cyan/10 text-zi-cyan'
                                    : 'border-white/10 text-zi-muted hover:border-white/20'
                                  }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {['upi', 'neft', 'rtgs'].includes(disburseMode) && (
                <div>
                  <label className="text-zi-muted text-xs font-medium uppercase tracking-wider">
                    Transaction Ref
                  </label>
                  <input value={txnRef} onChange={e => setTxnRef(e.target.value)}
                    placeholder="UTR / UPI ref" className="zi-input w-full mt-1" />
                </div>
              )}

              {sanctionedRupees && (
                <div className="bg-orbit-midnight/60 rounded-lg px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zi-muted">Sanction</span>
                    <span className="text-zi-white font-medium">
                      ₹{(parseFloat(sanctionedRupees) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {interestRatePm && tenureDays && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zi-muted">Monthly interest</span>
                      <span className="text-zi-gold font-medium">
                        ₹{((parseFloat(sanctionedRupees) || 0) * parseFloat(interestRatePm) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <NavButtons
              onBack={() => setStep(3)}
              onNext={goToStep5}
              nextLabel={disbursing ? 'Disbursing…' : 'Disburse Loan'}
              loading={disbursing}
            />
          </StepCard>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <StepCard key="s5" title="">
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30
                              flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-zi-white">Loan Created!</h2>
                <p className="text-zi-muted text-sm mt-1">
                  Loan has been disbursed for {selectedCustomer?.full_name}
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                {loanId && (
                  <button onClick={() => router.push(`/zipawn/loans/${loanId}`)}
                    className="btn-primary text-sm">
                    View Loan
                  </button>
                )}
                <button onClick={() => router.push('/zipawn/loans')}
                  className="btn-secondary text-sm">
                  All Loans
                </button>
              </div>
            </div>
          </StepCard>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blankItem(): Item {
  return { category: 'gold', description: '', weight_grams: '', purity: '', appraised_value_rupees: '', market_value_rupees: '' }
}

function updateItem(idx: number, field: keyof Item, value: string, setItems: React.Dispatch<React.SetStateAction<Item[]>>) {
  setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="zi-card p-5 space-y-4">
      {title && <h2 className="font-display font-bold text-lg text-zi-white">{title}</h2>}
      {children}
    </motion.div>
  )
}

function NavButtons({ onBack, onNext, nextLabel, loading }: {
  onBack?: () => void
  onNext: () => void
  nextLabel: string
  loading?: boolean
}) {
  return (
    <div className="flex justify-between gap-3 pt-2">
      {onBack ? (
        <button onClick={onBack}
          className="btn-secondary text-sm flex items-center gap-1.5">
          <ChevronLeft size={14} /> Back
        </button>
      ) : <div />}
      <button onClick={onNext} disabled={loading}
        className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50">
        {loading && <Loader2 size={13} className="animate-spin" />}
        {nextLabel} {!loading && <ChevronRight size={14} />}
      </button>
    </div>
  )
}
