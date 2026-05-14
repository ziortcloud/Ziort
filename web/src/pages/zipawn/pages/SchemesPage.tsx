import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useSchemes, useCreateScheme, useUpdateScheme, useDeleteScheme } from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

export default function SchemesPage({ entityId, subscriptionId }: Props) {
  const { data, isLoading } = useSchemes(entityId, subscriptionId)
  const createMutation = useCreateScheme(entityId, subscriptionId)
  const updateMutation = useUpdateScheme(entityId, subscriptionId)
  const deleteMutation = useDeleteScheme(entityId, subscriptionId)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  const schemes = data?.data ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Loan Schemes</h1>
          <p className="text-xs text-zi-muted">{schemes.length} scheme{schemes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> New Scheme
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && [...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-orbit-deep border border-white/5 animate-pulse" />
        ))}

        {!isLoading && schemes.map((scheme: any) => (
          <div key={scheme.id} className="flex items-center justify-between p-5 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors">
            <div>
              <p className="text-sm font-semibold text-zi-white">{scheme.scheme_name}</p>
              <p className="text-xs text-zi-muted mt-0.5">
                {scheme.interest_rate_pm}% / month · {scheme.interest_basis} ·
                Max tenure: {scheme.max_tenure_days} days
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(scheme); setShowForm(true) }}
                className="p-2 rounded-md text-zi-muted hover:text-zi-white hover:bg-orbit-navy transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={async () => {
                await deleteMutation.mutateAsync(scheme.id)
                toast.success('Scheme deleted')
              }}
                className="p-2 rounded-md text-zi-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && schemes.length === 0 && (
          <div className="py-16 text-center text-sm text-zi-muted">
            No loan schemes yet — create your first one
          </div>
        )}
      </div>

      {showForm && (
        <SchemeForm
          initial={editing}
          onSave={async (data) => {
            if (editing) {
              await updateMutation.mutateAsync({ id: editing.id, body: data })
              toast.success('Scheme updated')
            } else {
              await createMutation.mutateAsync(data)
              toast.success('Scheme created')
            }
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function SchemeForm({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    scheme_name:       initial?.scheme_name       || '',
    interest_rate_pm:  initial?.interest_rate_pm  || 2,
    interest_basis:    initial?.interest_basis    || 'flat',
    max_tenure_days:   initial?.max_tenure_days   || 180,
    ltv_percentage:    initial?.ltv_percentage    || 75,
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', extra?: Record<string, any>) => (
    <div>
      <label className="block text-xs font-medium text-zi-muted mb-1.5">{label}</label>
      {extra?.options ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/50 transition-colors">
          {extra.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
          className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                     focus:outline-none focus:border-zi-cyan/50 transition-colors" />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-midnight/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-orbit-deep border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-zi-white mb-5">{initial ? 'Edit Scheme' : 'New Scheme'}</h3>
        <div className="space-y-4">
          {field('Scheme Name', 'scheme_name')}
          {field('Interest Rate (% / month)', 'interest_rate_pm', 'number')}
          {field('Interest Basis', 'interest_basis', 'text', { options: ['flat', 'reducing', 'compound'] })}
          {field('Max Tenure (days)', 'max_tenure_days', 'number')}
          {field('LTV %', 'ltv_percentage', 'number')}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
