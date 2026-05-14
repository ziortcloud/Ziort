'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Percent, Star, Plus, Edit2, Trash2, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Loader2, AlertCircle,
  Settings, ToggleLeft, ToggleRight, Save, X,
} from 'lucide-react'
import { useSchemes, useCreateScheme, useUpdateScheme, useDeleteScheme } from '../hooks/use-zipawn'
import type { CreateSchemeInput } from '../validators'

// ─── Scheme Form ──────────────────────────────────────────────────────────────

const BLANK_SCHEME: Partial<CreateSchemeInput> = {
  scheme_code: '',
  scheme_name: '',
  description: '',
  interest_rate_pm: 1.5,
  interest_basis: 'daily',
  ltv_gold_916: 75,
  ltv_gold_999: 80,
  ltv_silver: 60,
  ltv_other: 50,
  min_loan_paise: 100000,
  max_loan_paise: 100000000,
  min_tenure_days: 30,
  max_tenure_days: 365,
  default_tenure_days: 180,
  processing_fee_type: 'percentage',
  processing_fee_value: 0,
  penalty_rate_pm: 0,
  penalty_grace_days: 0,
  rebate_enabled: false,
  is_default: false,
}

function SchemeForm({
  initial, onSave, onCancel, isSaving,
}: {
  initial: typeof BLANK_SCHEME
  onSave: (data: any) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<any>({ ...BLANK_SCHEME, ...initial })
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const Field = ({ label, name, type = 'text', step, min, max, placeholder }: {
    label: string; name: string; type?: string
    step?: string; min?: string; max?: string; placeholder?: string
  }) => (
    <div className="space-y-1">
      <label className="text-zi-muted text-xs">{label}</label>
      <input
        type={type} step={step} min={min} max={max}
        value={form[name] ?? ''}
        onChange={e => set(name, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="zi-input w-full text-sm"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Scheme Code *" name="scheme_code" placeholder="e.g. GOLD-STD" />
        <Field label="Scheme Name *" name="scheme_name" placeholder="e.g. Standard Gold Loan" />
      </div>

      <Field label="Description" name="description" placeholder="Optional description" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest Rate (% / month) *" name="interest_rate_pm"
          type="number" step="0.01" min="0.01" max="10" />
        <div className="space-y-1">
          <label className="text-zi-muted text-xs">Interest Basis</label>
          <select value={form.interest_basis}
            onChange={e => set('interest_basis', e.target.value)}
            className="zi-input w-full text-sm">
            <option value="daily">Daily (365)</option>
            <option value="monthly">Monthly Flat</option>
          </select>
        </div>
      </div>

      {/* LTV section */}
      <div>
        <p className="text-zi-muted text-xs font-medium mb-2 uppercase tracking-wider">LTV Ratios (%)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Gold 916" name="ltv_gold_916" type="number" step="1" min="0" max="100" />
          <Field label="Gold 999" name="ltv_gold_999" type="number" step="1" min="0" max="100" />
          <Field label="Silver"   name="ltv_silver"   type="number" step="1" min="0" max="100" />
          <Field label="Other"    name="ltv_other"    type="number" step="1" min="0" max="100" />
        </div>
      </div>

      {/* Tenure */}
      <div>
        <p className="text-zi-muted text-xs font-medium mb-2 uppercase tracking-wider">Tenure (days)</p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Min"     name="min_tenure_days"     type="number" min="1" />
          <Field label="Default" name="default_tenure_days" type="number" min="1" />
          <Field label="Max"     name="max_tenure_days"     type="number" min="1" max="730" />
        </div>
      </div>

      {/* Penalty */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Penalty Rate (% / month)" name="penalty_rate_pm"
          type="number" step="0.01" min="0" />
        <Field label="Penalty Grace (days)" name="penalty_grace_days"
          type="number" min="0" />
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.is_default}
            onChange={e => set('is_default', e.target.checked)}
            className="accent-zi-cyan w-4 h-4" />
          <span className="text-sm text-zi-white">Set as default scheme</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!form.rebate_enabled}
            onChange={e => set('rebate_enabled', e.target.checked)}
            className="accent-zi-cyan w-4 h-4" />
          <span className="text-sm text-zi-white">Enable early closure rebate</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1.5">
          <X size={13} /> Cancel
        </button>
        <button type="button" onClick={() => onSave(form)}
          disabled={isSaving || !form.scheme_code || !form.scheme_name}
          className="flex-1 btn-primary text-sm flex items-center justify-center gap-1.5
                     disabled:opacity-50">
          {isSaving
            ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
            : <><Save size={13} /> Save Scheme</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────

function SchemeCard({ scheme, onEdit, onDelete }: {
  scheme: any
  onEdit: (scheme: any) => void
  onDelete: (id: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="zi-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-lg bg-zi-blue/10 border border-zi-blue/20
                        flex items-center justify-center shrink-0">
          <Percent size={14} className="text-zi-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-zi-white font-medium">{scheme.scheme_name}</p>
            {scheme.is_default && (
              <span className="flex items-center gap-0.5 text-zi-gold text-xs">
                <Star size={10} /> Default
              </span>
            )}
          </div>
          <p className="text-zi-muted text-xs font-mono mt-0.5">{scheme.scheme_code}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-zi-muted text-xs">Rate / month</p>
            <p className="text-zi-cyan font-display font-bold">
              {parseFloat(scheme.interest_rate_pm).toFixed(2)}%
            </p>
          </div>
          {scheme.is_active
            ? <CheckCircle2 size={15} className="text-green-400" />
            : <XCircle size={15} className="text-zi-muted" />
          }
          <button onClick={() => onEdit(scheme)}
            className="p-1.5 rounded-lg border border-white/10 text-zi-muted hover:text-zi-white
                       hover:border-white/20 transition-all">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(scheme.id, scheme.scheme_name)}
            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10
                       transition-all">
            <Trash2 size={13} />
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="text-zi-muted hover:text-zi-white transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 pt-3">
              <SF label="Interest Rate"   value={`${parseFloat(scheme.interest_rate_pm).toFixed(2)}% / mo`} />
              <SF label="Interest Basis"  value={scheme.interest_basis?.replace('_', ' ')} />
              <SF label="Penalty Rate"    value={scheme.penalty_rate_pm ? `${parseFloat(scheme.penalty_rate_pm).toFixed(2)}% / mo` : 'None'} />
              <SF label="Grace Days"      value={scheme.penalty_grace_days ? `${scheme.penalty_grace_days}d` : 'None'} />
              <SF label="LTV Gold 916"    value={scheme.ltv_gold_916 ? `${scheme.ltv_gold_916}%` : '—'} />
              <SF label="LTV Gold 999"    value={scheme.ltv_gold_999 ? `${scheme.ltv_gold_999}%` : '—'} />
              <SF label="LTV Silver"      value={scheme.ltv_silver ? `${scheme.ltv_silver}%` : '—'} />
              <SF label="Tenure"          value={`${scheme.min_tenure_days ?? '?'}–${scheme.max_tenure_days ?? '?'} days`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SF({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-zi-muted text-xs">{label}</p>
      <p className="text-zi-white text-sm font-medium mt-0.5">{value ?? '—'}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsHubPage() {
  const { data: schemesPage, isLoading } = useSchemes()
  const schemes = (schemesPage as any)?.data ?? schemesPage ?? []
  const createScheme = useCreateScheme()
  const updateScheme = useUpdateScheme
  const deleteScheme = useDeleteScheme()

  const [mode, setMode]       = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEdit] = useState<any>(null)
  const [error, setError]     = useState('')
  const [deletingId, setDel]  = useState<string | null>(null)

  const activeUpdateMutation = useUpdateScheme(editTarget?.id ?? '')

  const handleCreate = async (form: any) => {
    setError('')
    try {
      const payload = {
        ...form,
        scheme_code: form.scheme_code.toUpperCase(),
        min_loan_paise: Math.round((form.min_loan_rupees ?? 1000) * 100),
        max_loan_paise: Math.round((form.max_loan_rupees ?? 1000000) * 100),
      }
      delete payload.min_loan_rupees
      delete payload.max_loan_rupees
      await createScheme.mutateAsync(payload)
      setMode('list')
    } catch (e: any) {
      setError(e.message ?? 'Failed to save scheme')
    }
  }

  const handleUpdate = async (form: any) => {
    setError('')
    try {
      await activeUpdateMutation.mutateAsync(form)
      setMode('list'); setEdit(null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to update scheme')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete scheme "${name}"? This cannot be undone.`)) return
    setDel(id)
    try {
      await deleteScheme.mutateAsync(id)
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete scheme')
    } finally {
      setDel(null)
    }
  }

  const handleEdit = (scheme: any) => {
    setEdit(scheme)
    setMode('edit')
    setError('')
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zi-white font-display flex items-center gap-2">
            <Settings size={18} className="text-zi-cyan" /> ZiPawn Settings
          </h1>
          <p className="text-xs text-zi-muted mt-0.5">Manage loan schemes, rates, and configuration</p>
        </div>
        {mode === 'list' && (
          <button onClick={() => { setMode('create'); setError('') }}
            className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> New Scheme
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      <AnimatePresence mode="wait">
        {(mode === 'create' || mode === 'edit') && (
          <motion.div key={mode}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="zi-card p-5 space-y-4">
            <h2 className="font-display font-semibold text-zi-white text-sm flex items-center gap-2">
              <Percent size={14} className="text-zi-cyan" />
              {mode === 'create' ? 'New Loan Scheme' : `Edit: ${editTarget?.scheme_name}`}
            </h2>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                              text-red-400 rounded-lg px-3 py-2 text-sm">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <SchemeForm
              initial={mode === 'edit' ? editTarget : BLANK_SCHEME}
              onSave={mode === 'create' ? handleCreate : handleUpdate}
              onCancel={() => { setMode('list'); setEdit(null); setError('') }}
              isSaving={createScheme.isPending || activeUpdateMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scheme list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zi-white font-display">
          Loan Schemes ({Array.isArray(schemes) ? schemes.length : 0})
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="zi-card p-4 animate-pulse flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-white/10 rounded w-32" />
                  <div className="h-2.5 bg-white/5 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !Array.isArray(schemes) || schemes.length === 0 ? (
          <div className="zi-card text-center py-12">
            <Percent size={28} className="text-zi-muted mx-auto mb-3" />
            <p className="text-zi-white font-medium">No schemes configured</p>
            <p className="text-zi-muted text-sm mt-1">
              Create a loan scheme to define interest rates, LTV ratios, and tenure rules.
            </p>
            <button onClick={() => setMode('create')}
              className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5">
              <Plus size={13} /> Create First Scheme
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {schemes.map((scheme: any) => (
              <motion.div key={scheme.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={deletingId === scheme.id ? 'opacity-40 pointer-events-none' : ''}>
                <SchemeCard
                  scheme={scheme}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
