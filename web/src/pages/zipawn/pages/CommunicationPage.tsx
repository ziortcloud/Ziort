// Communication Settings — SMS, WhatsApp, email providers + templates
import { useState } from 'react'
import { MessageSquare, Mail, Phone, Check, ChevronRight } from 'lucide-react'
import { useCommsSettings, useUpdateCommsSettings } from '../hooks/useZiPawn'
import { toast } from 'sonner'

interface Props { entityId: string; subscriptionId: string }

const CHANNELS = [
  { id: 'sms',       label: 'SMS',       icon: Phone,          color: 'text-blue-400 bg-blue-400/10',    providers: ['MSG91', 'Textlocal', 'Twilio', 'Fast2SMS'] },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageSquare,  color: 'text-green-400 bg-green-400/10',  providers: ['Meta Cloud API', 'Wati', 'AiSensy', 'Gupshup'] },
  { id: 'email',     label: 'Email',     icon: Mail,           color: 'text-orange-400 bg-orange-400/10', providers: ['SMTP', 'SendGrid', 'Amazon SES', 'Mailgun'] },
]

const TEMPLATES = [
  { id: 'overdue_reminder', label: 'Overdue Reminder',  desc: 'Sent when a loan becomes overdue' },
  { id: 'payment_receipt',  label: 'Payment Receipt',   desc: 'Sent after a payment is recorded' },
  { id: 'loan_creation',    label: 'Loan Created',      desc: 'Sent when a new loan is disbursed' },
  { id: 'loan_closure',     label: 'Loan Closed',       desc: 'Sent when a loan is fully closed' },
  { id: 'due_reminder',     label: 'Due Date Reminder', desc: 'Sent 3 days before loan maturity' },
]

export default function CommunicationPage({ entityId, subscriptionId }: Props) {
  const { data: settings, isLoading } = useCommsSettings(entityId, subscriptionId)
  const update = useUpdateCommsSettings(entityId, subscriptionId)
  const [tab, setTab]         = useState<'channels' | 'templates'>('channels')
  const [activeChannel, setActiveChannel] = useState('sms')
  const [form, setForm]       = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const ch = CHANNELS.find(c => c.id === activeChannel)!

  function startEdit() {
    const channelSettings = settings?.[activeChannel] ?? {}
    setForm({
      provider: channelSettings.provider ?? '',
      api_key:  channelSettings.api_key  ?? '',
      sender:   channelSettings.sender   ?? '',
    })
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    try {
      await update.mutateAsync({ [activeChannel]: form })
      toast.success(`${ch.label} settings saved`)
      setEditing(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Communication</h1>
        <p className="text-xs text-zi-muted">Configure how ZiPawn sends reminders and receipts to customers</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-orbit-deep border border-white/5 rounded-lg p-0.5 w-fit">
        {(['channels', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors
              ${tab === t ? 'bg-orbit-navy text-zi-white' : 'text-zi-muted hover:text-zi-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'channels' && (
        <div className="space-y-4">
          {/* Channel selector */}
          <div className="flex gap-2">
            {CHANNELS.map(c => {
              const Icon = c.icon
              const configured = !!settings?.[c.id]?.provider
              return (
                <button key={c.id} onClick={() => { setActiveChannel(c.id); setEditing(false) }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${activeChannel === c.id
                      ? 'bg-orbit-navy border-zi-blue/25 text-zi-white'
                      : 'bg-orbit-deep border-white/5 text-zi-muted hover:border-white/10 hover:text-zi-white'}`}>
                  <Icon size={14} />
                  {c.label}
                  {configured && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </button>
              )
            })}
          </div>

          {/* Channel config */}
          <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${ch.color} px-3 py-1.5 rounded-lg`}>
                <ch.icon size={14} />
                <span className="text-sm font-semibold">{ch.label} Configuration</span>
              </div>
              {!editing && (
                <button onClick={startEdit}
                  className="px-3 py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-xs text-zi-muted hover:text-zi-white transition-colors">
                  {settings?.[activeChannel]?.provider ? 'Edit' : 'Configure'}
                </button>
              )}
            </div>

            {!editing ? (
              settings?.[activeChannel]?.provider ? (
                <div className="space-y-2">
                  <p className="text-xs text-zi-muted">Provider: <span className="text-zi-white font-medium">{settings[activeChannel].provider}</span></p>
                  <p className="text-xs text-zi-muted">Sender ID: <span className="text-zi-white font-medium">{settings[activeChannel].sender || '—'}</span></p>
                  <p className="text-xs text-zi-muted">API Key: <span className="text-zi-white font-medium">{'•'.repeat(16)}</span></p>
                </div>
              ) : (
                <p className="text-sm text-zi-muted">Not configured</p>
              )
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Provider</label>
                  <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors">
                    <option value="">Select provider…</option>
                    {ch.providers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">API Key / Auth Token</label>
                  <input type="password" value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                    placeholder="Enter API key"
                    className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Sender ID / From Address</label>
                  <input type="text" value={form.sender} onChange={e => setForm(p => ({ ...p, sender: e.target.value }))}
                    placeholder="e.g. ZIPAWN or noreply@yourbiz.com"
                    className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none focus:border-zi-cyan/40 transition-colors" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={save} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-zi-blue hover:bg-zi-blue/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-3">
          <p className="text-xs text-zi-muted">Message templates are sent automatically when these events occur. Variables like {'{customer_name}'}, {'{amount}'}, {'{loan_id}'} are auto-filled.</p>
          {TEMPLATES.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
              <div>
                <p className="text-sm font-medium text-zi-white group-hover:text-zi-cyan transition-colors">{t.label}</p>
                <p className="text-xs text-zi-muted mt-0.5">{t.desc}</p>
              </div>
              <ChevronRight size={14} className="text-zi-muted group-hover:text-zi-cyan transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
