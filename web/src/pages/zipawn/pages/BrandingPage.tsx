// Company Branding — logo, receipt header, colors
import { useState } from 'react'
import { Check } from 'lucide-react'
import { useVendorSettings, useUpdateVendorSettings } from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

export default function BrandingPage({ entityId, subscriptionId }: Props) {
  const { data: vendor, isLoading } = useVendorSettings(entityId, subscriptionId)
  const updateVendor = useUpdateVendorSettings(entityId, subscriptionId)
  const [form, setForm] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  function startEdit() {
    setForm({
      trade_name:      vendor?.trade_name      ?? '',
      legal_name:      vendor?.legal_name      ?? '',
      registration_no: vendor?.registration_no ?? '',
      gstin:           vendor?.gstin           ?? '',
      phone:           vendor?.phone           ?? '',
      email:           vendor?.email           ?? '',
      address:         vendor?.address         ?? '',
      city:            vendor?.city            ?? '',
      state:           vendor?.state           ?? '',
      pincode:         vendor?.pincode         ?? '',
      receipt_header:  vendor?.receipt_header  ?? '',
      receipt_footer:  vendor?.receipt_footer  ?? '',
      website:         vendor?.website         ?? '',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      await updateVendor.mutateAsync(form)
      toast.success('Branding updated')
      setEditing(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: string, type = 'text', multiline = false) => (
    <div>
      <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={form[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3}
          className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white resize-none focus:outline-none focus:border-zi-cyan/40 transition-colors" />
      ) : (
        <input type={type} value={form[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
      )}
    </div>
  )

  if (isLoading) return (
    <div className="p-6 space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zi-white">Branding & Company Details</h1>
          <p className="text-xs text-zi-muted">These details appear on pawn tickets and receipts</p>
        </div>
        {!editing && (
          <button onClick={startEdit}
            className="px-4 py-2 bg-orbit-deep border border-white/8 hover:border-white/16 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-4">
          {[
            { label: 'Trade Name',       value: vendor?.trade_name      },
            { label: 'Legal Name',       value: vendor?.legal_name      },
            { label: 'GSTIN',            value: vendor?.gstin           },
            { label: 'Registration No',  value: vendor?.registration_no },
            { label: 'Phone',            value: vendor?.phone           },
            { label: 'Email',            value: vendor?.email           },
            { label: 'Address',          value: [vendor?.address, vendor?.city, vendor?.state, vendor?.pincode].filter(Boolean).join(', ') },
            { label: 'Receipt Header',   value: vendor?.receipt_header  },
            { label: 'Receipt Footer',   value: vendor?.receipt_footer  },
            { label: 'Website',          value: vendor?.website         },
          ].map(({ label, value }) => value ? (
            <div key={label} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zi-muted mb-1">{label}</p>
              <p className="text-sm text-zi-white">{value}</p>
            </div>
          ) : null)}
          {!vendor?.trade_name && (
            <div className="py-12 text-center text-sm text-zi-muted">
              No branding info yet — click Edit to set up your company details
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Business Identity</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {field('Trade Name', 'trade_name')}
              {field('Legal Name', 'legal_name')}
              {field('Registration No', 'registration_no')}
              {field('GSTIN', 'gstin')}
              {field('Phone', 'phone', 'tel')}
              {field('Email', 'email', 'email')}
              {field('Website', 'website', 'url')}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Address</p>
            <div className="grid gap-4">
              {field('Street / Area', 'address')}
              <div className="grid sm:grid-cols-3 gap-4">
                {field('City', 'city')}
                {field('State', 'state')}
                {field('Pincode', 'pincode')}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zi-muted">Receipt Content</p>
            {field('Receipt Header Text', 'receipt_header', 'text', true)}
            {field('Receipt Footer Text (terms, etc.)', 'receipt_footer', 'text', true)}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setEditing(false)}
              className="px-4 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
