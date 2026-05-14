'use client'
import { useSessionStore } from '@/ziorbitcore/store/session'
import { useRequirements } from '../hooks/use-requirements'

export default function RequirementListPage() {
  const { session } = useSessionStore()
  const entityId = session?.activeEntity?.id ?? ''
  const sub = session?.activeSubscriptions.find(s => s.product_code === 'ZND')
  const { data: requirements, isLoading } = useRequirements(entityId, sub?.id ?? '')

  if (!sub) {
    return (
      <div className="zi-card text-center py-12">
        <p className="text-zi-muted text-sm">ZiNeed subscription not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-zi-white">Requirements</h1>
          <p className="ref-code mt-0.5">{sub.ref_code}</p>
        </div>
        <a href="/zineed/requirements/new" className="btn-primary text-sm">
          + Post Requirement
        </a>
      </div>

      {isLoading ? (
        <div className="text-zi-muted text-sm">Loading…</div>
      ) : !requirements?.length ? (
        <div className="zi-card text-center py-12">
          <p className="text-zi-muted text-sm">No requirements posted yet.</p>
          <p className="text-zi-muted text-xs mt-1">Post a requirement to find suppliers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requirements.map(req => (
            <RequirementRow key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequirementRow({ req }: {
  req: {
    zi_code: string
    ref_code: string
    title: string
    category: string
    status: string
    is_urgent: boolean
    proposal_count: number
    expires_at: string
    budget_min_paise?: number
    budget_max_paise?: number
  }
}) {
  const statusColor: Record<string, string> = {
    draft:               'text-zi-muted',
    published:           'text-zi-cyan',
    matching:            'text-zi-gold',
    proposals_received:  'text-green-400',
    in_negotiation:      'text-zi-gold',
    deal_closed:         'text-green-400',
    completed:           'text-zi-muted',
    cancelled:           'text-red-400',
    expired:             'text-red-500',
  }

  const budgetStr = req.budget_max_paise
    ? `₹${(req.budget_max_paise / 100).toLocaleString('en-IN')}`
    : 'Open budget'

  return (
    <div className="zi-card cursor-pointer hover:border-zi-blue/20 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-zi-white text-sm truncate">{req.title}</p>
            {req.is_urgent && (
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20
                               px-1.5 py-0.5 rounded font-display font-semibold uppercase tracking-wider shrink-0">
                Urgent
              </span>
            )}
          </div>
          <p className="ref-code mt-0.5">{req.ref_code}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-zi-muted text-xs">{req.category}</span>
            <span className="text-zi-muted text-xs">{budgetStr}</span>
            <span className="text-zi-muted text-xs">{req.proposal_count} proposals</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs font-display font-semibold capitalize ${statusColor[req.status] ?? 'text-zi-muted'}`}>
            {req.status.replace('_', ' ')}
          </span>
          <p className="text-zi-muted text-xs mt-1">Expires {req.expires_at}</p>
        </div>
      </div>
    </div>
  )
}
