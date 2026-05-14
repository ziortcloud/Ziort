import { useNavigate } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { useEngagements } from '../hooks/useZiDriver'
import { useState } from 'react'
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

export default function EngagementsPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useEngagements(entityId, subscriptionId, {
    status: statusFilter || undefined, limit: 50,
  })
  const engagements = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Engagements</h1>
        <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} engagements</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['','OFFERED','ACCEPTED','IN_PROGRESS','COMPLETED','DECLINED','CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-purple-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : engagements.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <Briefcase size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No engagements found. Post availability to get offers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {engagements.map((eng: any) => (
            <button key={eng.id} onClick={() => navigate(`/zidriver/engagements/${eng.id}`)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 text-left transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[eng.status] ?? STATUS_COLOR.OFFERED}`}>
                    {eng.status?.replace('_', ' ')}
                  </span>
                  {eng.status === 'OFFERED' && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-semibold animate-pulse">NEW OFFER</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-zi-white">{eng.hirer_name ?? 'Company'}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-zi-muted">
                  {eng.from_city && <span>📍 {eng.from_city}{eng.to_city ? ` → ${eng.to_city}` : ''}</span>}
                  {eng.start_date && <span>{format(new Date(eng.start_date), 'dd MMM')}{eng.end_date ? ` – ${format(new Date(eng.end_date), 'dd MMM')}` : ''}</span>}
                </div>
              </div>
              {eng.offered_rate_paise && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-purple-400">₹{(eng.offered_rate_paise/100).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-zi-muted">per day</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
