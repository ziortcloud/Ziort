import { useState } from 'react'
import { FileText, Plus, X, Check, AlertCircle } from 'lucide-react'
import { useDocuments, useAddDocument, useUpdateDocument } from '../hooks/useZiDriver'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const DOC_TYPES = ['LICENSE','AADHAAR','PAN','PASSPORT','VEHICLE_RC','INSURANCE','FITNESS','PERMIT','BADGE','OTHER']

const EMPTY = { doc_type: 'LICENSE', doc_number: '', expiry_date: '', notes: '' }
type F = typeof EMPTY

export default function DocumentsPage({ entityId, subscriptionId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any | null>(null)
  const [form, setForm]   = useState<F>({ ...EMPTY })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data }   = useDocuments(entityId, subscriptionId)
  const addDoc     = useAddDocument(entityId, subscriptionId)
  const updateDoc  = useUpdateDocument(entityId, subscriptionId)
  const docs       = data?.data ?? []

  function set(k: keyof F, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function openAdd() {
    setEditing(null); setForm({ ...EMPTY }); setErrors({}); setShowModal(true)
  }
  function openEdit(d: any) {
    setEditing(d)
    setForm({ doc_type: d.doc_type, doc_number: d.doc_number ?? '', expiry_date: d.expiry_date ?? '', notes: d.notes ?? '' })
    setErrors({}); setShowModal(true)
  }

  async function save() {
    const e: Record<string, string> = {}
    if (!form.doc_number.trim()) e.doc_number = 'Document number required'
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        doc_type:    form.doc_type,
        doc_number:  form.doc_number.trim(),
        expiry_date: form.expiry_date || undefined,
        notes:       form.notes       || undefined,
      }
      if (editing) {
        await updateDoc.mutateAsync({ docId: editing.id, body: payload })
        toast.success('Document updated')
      } else {
        await addDoc.mutateAsync(payload)
        toast.success('Document added')
      }
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const ic = (err?: boolean) =>
    `w-full px-3 py-2.5 bg-orbit-navy border ${err ? 'border-red-500/50' : 'border-white/8'} rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors`

  const isExpiringSoon = (d: string) => d && new Date(d) < new Date(Date.now() + 30 * 86400000)
  const isExpired      = (d: string) => d && new Date(d) < new Date()

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Documents</h1>
          <p className="text-xs text-zi-muted">{docs.length} documents uploaded</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-500/90 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Add Document
        </button>
      </div>

      {docs.filter((d: any) => d.expiry_date && isExpiringSoon(d.expiry_date)).length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">Some documents are expiring soon. Please update them.</p>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <FileText size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted mb-4">No documents uploaded yet</p>
          <button onClick={openAdd} className="px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium text-white">Add First Document</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {docs.map((d: any) => {
            const expired  = d.expiry_date && isExpired(d.expiry_date)
            const expiring = !expired && d.expiry_date && isExpiringSoon(d.expiry_date)
            return (
              <div key={d.id} className={`p-4 rounded-xl bg-orbit-deep border transition-colors ${expired ? 'border-red-500/30' : expiring ? 'border-yellow-500/30' : 'border-white/5'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-zi-muted uppercase tracking-wider">{d.doc_type.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-semibold text-zi-white mt-0.5">{d.doc_number}</p>
                  </div>
                  {expired ? (
                    <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded text-[10px] font-semibold">EXPIRED</span>
                  ) : expiring ? (
                    <span className="px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded text-[10px] font-semibold">EXPIRING</span>
                  ) : d.verified ? (
                    <span className="px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded text-[10px] font-semibold">VERIFIED</span>
                  ) : null}
                </div>
                {d.expiry_date && (
                  <p className={`text-xs mt-2 ${expired ? 'text-red-400' : expiring ? 'text-yellow-400' : 'text-zi-muted'}`}>
                    Expires: {format(new Date(d.expiry_date), 'dd MMM yyyy')}
                  </p>
                )}
                {d.notes && <p className="text-xs text-zi-muted/60 mt-1 truncate">{d.notes}</p>}
                <button onClick={() => openEdit(d)} className="mt-3 w-full py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-base font-semibold text-zi-white">{editing ? 'Edit Document' : 'Add Document'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Fld label="Document Type">
                <select value={form.doc_type} onChange={e => set('doc_type', e.target.value)} className={ic()}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </Fld>
              <Fld label="Document Number *" err={errors.doc_number}>
                <input value={form.doc_number} onChange={e => set('doc_number', e.target.value)} className={ic(!!errors.doc_number)} />
              </Fld>
              <Fld label="Expiry Date"><input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={ic()} /></Fld>
              <Fld label="Notes"><input value={form.notes} onChange={e => set('notes', e.target.value)} className={ic()} /></Fld>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fld({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}{err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}</div>
}
