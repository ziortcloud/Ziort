// Metal Prices — live gold/silver rate management
import { useState } from 'react'
import { useGoldRates, useUpdateGoldRate } from '../hooks/useZiPawn'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const METAL_ROWS = [
  { key: 'gold_24k_per_gram_paise', label: 'Gold 24K', unit: '/ gram', color: 'text-amber-400' },
  { key: 'gold_22k_per_gram_paise', label: 'Gold 22K', unit: '/ gram', color: 'text-amber-400' },
  { key: 'gold_18k_per_gram_paise', label: 'Gold 18K', unit: '/ gram', color: 'text-amber-300' },
  { key: 'silver_per_gram_paise',   label: 'Silver',   unit: '/ gram', color: 'text-slate-300' },
]

export default function GoldRatePage({ entityId, subscriptionId }: Props) {
  const { data: rates, isLoading } = useGoldRates(entityId, subscriptionId)
  const updateRate = useUpdateGoldRate(entityId, subscriptionId)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState(false)

  function startEdit() {
    if (rates) {
      const f: Record<string, string> = {}
      METAL_ROWS.forEach(({ key }) => {
        f[key] = rates[key] ? String(rates[key] / 100) : ''
      })
      setForm(f)
    }
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, number> = {}
      METAL_ROWS.forEach(({ key }) => {
        const v = parseFloat(form[key])
        if (!isNaN(v) && v > 0) payload[key] = Math.round(v * 100)
      })
      await updateRate.mutateAsync(payload)
      toast.success('Metal rates updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update rates')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-orbit-deep rounded" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Metal Prices</h1>
          <p className="text-xs text-zi-muted">
            {rates?.updated_at
              ? `Last updated ${format(new Date(rates.updated_at), 'dd MMM yyyy, hh:mm a')}`
              : 'Set the current gold and silver rates for automatic loan valuation'
            }
          </p>
        </div>
        {!editing && (
          <button onClick={startEdit}
            className="px-4 py-2 bg-orbit-deep border border-white/8 hover:border-white/16 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Update Rates
          </button>
        )}
      </div>

      {/* Rate cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {METAL_ROWS.map(({ key, label, unit, color }) => {
          const paise = rates?.[key]
          const value = paise ? (paise / 100) : null
          return (
            <div key={key} className="p-5 rounded-xl bg-orbit-deep border border-white/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zi-muted mb-2">{label}</p>
              {editing ? (
                <div className="flex items-center gap-2">
                  <span className="text-zi-muted text-sm">₹</span>
                  <input
                    type="number"
                    value={form[key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors"
                    placeholder="0.00"
                  />
                  <span className="text-xs text-zi-muted whitespace-nowrap">{unit}</span>
                </div>
              ) : (
                <p className={`text-2xl font-bold tabular-nums ${color}`}>
                  {value != null ? `₹${value.toLocaleString('en-IN')}` : '—'}
                  {value != null && <span className="text-sm font-normal text-zi-muted ml-1">{unit}</span>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {editing && (
        <div className="flex gap-3">
          <button onClick={() => setEditing(false)}
            className="px-4 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Save Rates'
            }
          </button>
        </div>
      )}

      {/* Info note */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
        <p className="text-xs text-amber-300 leading-relaxed">
          These rates are used for automatic loan valuation during new ticket creation. Update them daily or when market rates change.
        </p>
      </div>
    </div>
  )
}
