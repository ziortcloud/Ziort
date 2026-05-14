// Branch Management
import { useState } from 'react'
import { Plus, Edit2, MapPin, Phone, X, Check } from 'lucide-react'
import { useBranches, useCreateBranch, useUpdateBranch } from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const EMPTY = { branch_name: '', address: '', city: '', state: '', pincode: '', phone: '', is_active: true }

export default function BranchesPage({ entityId, subscriptionId }: Props) {
  const { data, isLoading }       = useBranches(entityId, subscriptionId)
  const createBranch              = useCreateBranch(entityId, subscriptionId)
  const updateBranch              = useUpdateBranch(entityId, subscriptionId)
  const [editing, setEditing]     = useState<any | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ ...EMPTY })
  const [saving, setSaving]       = useState(false)

  const branches = data?.data ?? []

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }

  function openEdit(b: any) {
    setEditing(b)
    setForm({
      branch_name: b.branch_name ?? '', address: b.address ?? '', city: b.city ?? '',
      state: b.state ?? '', pincode: b.pincode ?? '', phone: b.phone ?? '',
      is_active: b.is_active ?? true,
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.branch_name.trim()) { toast.error('Branch name required'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateBranch.mutateAsync({ id: editing.id, body: form })
        toast.success('Branch updated')
      } else {
        await createBranch.mutateAsync(form)
        toast.success('Branch created')
      }
      setShowForm(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const f = (label: string, key: keyof typeof EMPTY, type = 'text') => (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={String(form[key])}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Branches</h1>
          <p className="text-xs text-zi-muted">{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-zi-blue hover:bg-zi-blue/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> New Branch
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && [...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-orbit-deep border border-white/5 animate-pulse" />
        ))}

        {!isLoading && branches.map((b: any) => (
          <div key={b.id} className="flex items-start justify-between p-5 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zi-white">{b.branch_name}</p>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border
                  ${b.is_active ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-zi-muted/10 text-zi-muted border-zi-muted/20'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {(b.address || b.city) && (
                <div className="flex items-center gap-1.5 text-xs text-zi-muted">
                  <MapPin size={10} />
                  <span>{[b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {b.phone && (
                <div className="flex items-center gap-1.5 text-xs text-zi-muted">
                  <Phone size={10} />
                  <span>{b.phone}</span>
                </div>
              )}
            </div>
            <button onClick={() => openEdit(b)}
              className="p-2 rounded-md text-zi-muted hover:text-zi-white hover:bg-orbit-navy transition-colors shrink-0">
              <Edit2 size={13} />
            </button>
          </div>
        ))}

        {!isLoading && branches.length === 0 && (
          <div className="py-16 text-center text-sm text-zi-muted">
            No branches yet — add your first branch
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-orbit-midnight/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-orbit-deep border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h3 className="text-base font-semibold text-zi-white">{editing ? 'Edit Branch' : 'New Branch'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-zi-muted hover:text-zi-white transition-colors"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {f('Branch Name *', 'branch_name')}
              {f('Phone', 'phone', 'tel')}
              {f('Address / Street', 'address')}
              <div className="grid grid-cols-3 gap-3">
                {f('City', 'city')}
                {f('State', 'state')}
                {f('Pincode', 'pincode')}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-orbit-navy accent-zi-blue" />
                <label htmlFor="is_active" className="text-sm text-zi-white cursor-pointer">Branch is active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
