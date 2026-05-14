import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Star, X } from 'lucide-react'
import { useEngagement, useRespondToEngagement, useRateEngagement } from '../hooks/useZiDriver'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const STATUS_COLOR: Record<string, string> = {
  OFFERED:     'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ACCEPTED:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
  DECLINED:    'bg-red-500/15 text-red-400 border-red-500/20',
  IN_PROGRESS: 'bg-green-500/15 text-green-400 border-green-500/20',
  COMPLETED:   'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CANCELLED:   'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
}

export default function EngagementDetailPage({ entityId, subscriptionId }: Props) {
  const { engId } = useParams<{ engId: string }>()
  const navigate  = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [showRate,   setShowRate]   = useState(false)
  const [rating,     setRating]     = useState(5)
  const [comment,    setComment]    = useState('')

  const { data: eng, isLoading } = useEngagement(entityId, subscriptionId, engId!)
  const respond   = useRespondToEngagement(entityId, subscriptionId)
  const rateEng   = useRateEngagement(entityId, subscriptionId)

  if (isLoading) return (
    <div className="p-6"><div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-orbit-deep rounded-xl animate-pulse" />)}</div></div>
  )
  if (!eng) return <div className="p-6"><p className="text-zi-muted text-sm">Engagement not found.</p></div>

  async function action(a: string) {
    setSubmitting(true)
    try {
      await respond.mutateAsync({ engId: eng.id, action: a })
      toast.success(`Engagement ${a}d`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Action failed')
    } finally { setSubmitting(false) }
  }

  async function submitRating() {
    setSubmitting(true)
    try {
      await rateEng.mutateAsync({ engId: eng.id, body: { rating, comment: comment || undefined } })
      toast.success('Rating submitted')
      setShowRate(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Rating failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/zidriver/engagements')} className="mt-0.5 text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-zi-white">{eng.hirer_name ?? 'Engagement'}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[eng.status] ?? STATUS_COLOR.OFFERED}`}>
              {eng.status?.replace('_', ' ')}
            </span>
          </div>
          {eng.from_city && (
            <p className="text-xs text-zi-muted mt-0.5">{eng.from_city}{eng.to_city ? ` → ${eng.to_city}` : ''}</p>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="p-5 rounded-xl bg-orbit-deep border border-white/5 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60 mb-3">Offer Details</p>
        {eng.start_date && <InfoRow label="Start Date" value={format(new Date(eng.start_date), 'dd MMM yyyy')} />}
        {eng.end_date   && <InfoRow label="End Date"   value={format(new Date(eng.end_date), 'dd MMM yyyy')} />}
        {eng.offered_rate_paise && <InfoRow label="Daily Rate" value={`₹${(eng.offered_rate_paise/100).toLocaleString('en-IN')}`} />}
        {eng.from_city  && <InfoRow label="Location"  value={`${eng.from_city}${eng.to_city ? ` → ${eng.to_city}` : ''}`} />}
        {eng.vehicle_type && <InfoRow label="Vehicle"  value={eng.vehicle_type} />}
        {eng.notes      && <InfoRow label="Notes"     value={eng.notes} />}
        <InfoRow label="Created" value={eng.created_at ? format(new Date(eng.created_at), 'dd MMM yyyy, hh:mm a') : '—'} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {eng.status === 'OFFERED' && (
          <>
            <button onClick={() => action('decline')} disabled={submitting}
              className="px-4 py-2 bg-orbit-navy border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
              Decline Offer
            </button>
            <button onClick={() => action('accept')} disabled={submitting}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
              {submitting ? '…' : 'Accept Offer'}
            </button>
          </>
        )}
        {eng.status === 'ACCEPTED' && (
          <button onClick={() => action('start')} disabled={submitting}
            className="px-4 py-2 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {submitting ? '…' : 'Start Work'}
          </button>
        )}
        {eng.status === 'IN_PROGRESS' && (
          <button onClick={() => action('complete')} disabled={submitting}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {submitting ? '…' : 'Mark Complete'}
          </button>
        )}
        {eng.status === 'COMPLETED' && !eng.rated && (
          <button onClick={() => setShowRate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/20 rounded-lg text-sm text-amber-400 hover:bg-amber-500/25 transition-colors">
            <Star size={14} /> Rate Employer
          </button>
        )}
      </div>

      {/* Rating Modal */}
      {showRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zi-white">Rate Employer</h2>
              <button onClick={() => setShowRate(false)} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-2">Rating</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                    <Star size={28} className={n <= rating ? 'text-amber-400' : 'text-zi-muted/30'} fill={n <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Comment (optional)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-purple-400/40 transition-colors resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRate(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
              <button onClick={submitRating} disabled={submitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {submitting ? '…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-zi-muted shrink-0">{label}</span>
      <span className="text-xs text-zi-white text-right">{value}</span>
    </div>
  )
}
