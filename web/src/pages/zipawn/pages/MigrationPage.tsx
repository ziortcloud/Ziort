// Loan Migration — import existing loan books into ZiPawn
import { useState } from 'react'
import { Upload, Plus, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { useCreateMigrationLoan } from '../hooks/useZiPawn'
import { useSchemes, useCustomers } from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const TABS = ['Manual Entry', 'CSV Upload', 'Help']

const EMPTY_LOAN = {
  customer_search: '', customer_id: '',
  scheme_id: '',
  principal: '', outstanding: '', interest_rate_pm: '',
  tenure_days: '90', opened_at: '', maturity_date: '',
  items_description: '',
  payment_mode: 'cash',
}

export default function MigrationPage({ entityId, subscriptionId }: Props) {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ ...EMPTY_LOAN })
  const [customerSearch, setCustomerSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  const { data: customersData } = useCustomers(entityId, subscriptionId, { search: customerSearch || undefined, limit: 20 })
  const { data: schemesData }   = useSchemes(entityId, subscriptionId)
  const createMigration         = useCreateMigrationLoan(entityId, subscriptionId)

  const customers  = customersData?.data ?? []
  const schemes    = schemesData?.data   ?? []

  async function submit() {
    if (!form.customer_id)  { toast.error('Select a customer'); return }
    if (!form.principal)    { toast.error('Enter principal amount'); return }
    if (!form.outstanding)  { toast.error('Enter outstanding amount'); return }
    if (!form.opened_at)    { toast.error('Enter loan start date'); return }
    setSaving(true)
    try {
      await createMigration.mutateAsync({
        customer_id:        form.customer_id,
        scheme_id:          form.scheme_id || null,
        principal_paise:    Math.round(parseFloat(form.principal) * 100),
        outstanding_paise:  Math.round(parseFloat(form.outstanding) * 100),
        interest_rate_pm:   parseFloat(form.interest_rate_pm) || null,
        tenure_days:        parseInt(form.tenure_days) || 90,
        opened_at:          form.opened_at,
        maturity_date:      form.maturity_date || null,
        items_description:  form.items_description,
        payment_mode:       form.payment_mode,
        is_migration:       true,
      })
      toast.success('Loan migrated successfully')
      setForm({ ...EMPTY_LOAN })
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Migration failed')
    } finally {
      setSaving(false)
    }
  }

  const f = (label: string, key: keyof typeof EMPTY_LOAN, type = 'text') => (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Loan Migration</h1>
        <p className="text-xs text-zi-muted">Import your existing loan book into ZiPawn</p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300 leading-relaxed">
          Migrated loans are marked as "migration" and will not send disbursement notifications. Make sure all data is accurate before migrating.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-orbit-deep border border-white/5 rounded-lg p-0.5 w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === i ? 'bg-orbit-navy text-zi-white' : 'text-zi-muted hover:text-zi-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Manual Entry */}
      {tab === 0 && (
        <div className="space-y-5">
          {/* Customer */}
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Customer</p>
            <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Search by name or mobile…"
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
            {form.customer_id && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <Check size={12} /> {customers.find((c: any) => c.id === form.customer_id)?.full_name ?? 'Customer selected'}
              </p>
            )}
            {customerSearch && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {customers.map((c: any) => (
                  <button key={c.id} onClick={() => { setForm(p => ({ ...p, customer_id: c.id })); setCustomerSearch('') }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-orbit-navy border border-white/5 hover:border-zi-cyan/20 text-left text-sm transition-colors">
                    <div className="w-7 h-7 rounded-full bg-zi-blue/15 flex items-center justify-center text-xs font-bold text-zi-blue shrink-0">
                      {c.full_name?.[0]}
                    </div>
                    <div>
                      <p className="text-zi-white font-medium">{c.full_name}</p>
                      <p className="text-[11px] text-zi-muted">{c.zi_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loan Details */}
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Loan Details</p>
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Scheme (optional)</label>
              <select value={form.scheme_id} onChange={e => setForm(p => ({ ...p, scheme_id: e.target.value }))}
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors">
                <option value="">No scheme / custom rate</option>
                {schemes.map((s: any) => <option key={s.id} value={s.id}>{s.scheme_name}</option>)}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {f('Original Principal (₹) *', 'principal', 'number')}
              {f('Outstanding Amount (₹) *', 'outstanding', 'number')}
              {!form.scheme_id && f('Interest Rate (% / month)', 'interest_rate_pm', 'number')}
              {f('Tenure (days)', 'tenure_days', 'number')}
              {f('Loan Start Date *', 'opened_at', 'date')}
              {f('Maturity Date', 'maturity_date', 'date')}
            </div>
          </div>

          {/* Items */}
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Pledged Items</p>
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={form.items_description}
                onChange={e => setForm(p => ({ ...p, items_description: e.target.value }))}
                rows={3} placeholder="e.g. 2 gold bangles (22K, 15g), 1 gold chain (22K, 10g)"
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white resize-none focus:outline-none focus:border-zi-cyan/40 transition-colors placeholder:text-zi-muted/40" />
            </div>
          </div>

          <button onClick={submit} disabled={saving || done}
            className="w-full flex items-center justify-center gap-2 py-3 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-colors">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : done
              ? <><Check size={14} /> Migrated!</>
              : <><Plus size={14} /> Migrate Loan</>
            }
          </button>
        </div>
      )}

      {/* CSV Upload */}
      {tab === 1 && (
        <div className="p-8 rounded-xl bg-orbit-deep border border-dashed border-white/15 text-center">
          <Upload size={32} className="text-zi-muted mx-auto mb-3" />
          <p className="text-sm font-medium text-zi-white mb-1">Upload CSV file</p>
          <p className="text-xs text-zi-muted mb-4">Download the template, fill it, then upload to batch-migrate loans</p>
          <div className="flex gap-3 justify-center">
            <a href="#" className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
              Download Template
            </a>
            <label className="px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors">
              Choose File
              <input type="file" accept=".csv" className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Help */}
      {tab === 2 && (
        <div className="space-y-4">
          {[
            { q: 'What is loan migration?', a: 'Migration lets you bring existing loans from your paper records or old software into ZiPawn. Migrated loans are marked separately.' },
            { q: 'Will customers be notified?', a: 'No. Migration does not trigger any SMS or WhatsApp notifications.' },
            { q: 'Can I edit a migrated loan?', a: 'Yes, you can edit migrated loans just like regular loans. You can also take payments and close them normally.' },
            { q: 'What CSV format is required?', a: 'Download the template from the CSV Upload tab. Required columns: customer_name, mobile, principal, outstanding, opened_at, items_description.' },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
              <p className="text-sm font-semibold text-zi-white mb-1.5">{q}</p>
              <p className="text-xs text-zi-muted leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
