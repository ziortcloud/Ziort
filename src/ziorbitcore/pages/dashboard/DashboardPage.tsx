'use client'
import { useSession } from '../../hooks/use-session'

export default function DashboardPage() {
  const { session } = useSession()

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zi-muted text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-zi-white">
          Good morning, {session.individual.display_name.split(' ')[0]}
        </h1>
        <p className="text-zi-muted text-sm mt-1">
          {session.activeEntity
            ? `${session.activeEntity.legal_name} · ${session.activeEntity.zi_code}`
            : 'Select an entity to get started'}
        </p>
      </div>

      {session.activeEntity && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Entity Code" value={session.activeEntity.zi_code} mono />
          <SummaryCard
            label="Entity Type"
            value={session.activeEntity.entity_type.replace('_', ' ')}
          />
          <SummaryCard
            label="Location"
            value={
              [session.activeEntity.city, session.activeEntity.state]
                .filter(Boolean)
                .join(', ') || 'Not set'
            }
          />
          <SummaryCard
            label="Products"
            value={`${session.activeSubscriptions.length} active`}
          />
        </div>
      )}

      <div>
        <h2 className="font-display font-bold text-lg text-zi-white mb-3">Your Products</h2>
        {session.activeSubscriptions.length === 0 ? (
          <div className="zi-card text-center py-12">
            <p className="text-zi-muted text-sm">No products yet.</p>
            <p className="text-zi-muted text-xs mt-1">Go to Settings → Products to subscribe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.activeSubscriptions.map(sub => (
              <ProductCard key={sub.id} subscription={sub} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="zi-card">
      <p className="text-zi-muted text-xs font-display font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-zi-white text-lg font-display font-bold mt-1 ${mono ? 'font-mono text-zi-cyan' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function ProductCard({
  subscription,
}: {
  subscription: {
    id: string
    product_name: string
    plan_type: string
    status: string
    ref_code: string
    zi_code: string
  }
}) {
  const statusColors: Record<string, string> = {
    trial:     'text-zi-gold',
    active:    'text-green-400',
    paused:    'text-zi-muted',
    grace:     'text-red-400',
    cancelled: 'text-red-500',
  }

  return (
    <div className="zi-card hover:border-zi-blue/20 transition-all duration-200 cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-bold text-zi-white">{subscription.product_name}</p>
          <p className="ref-code mt-0.5">{subscription.ref_code}</p>
        </div>
        <span className={`text-xs font-display font-semibold capitalize ${statusColors[subscription.status] ?? 'text-zi-muted'}`}>
          {subscription.status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs bg-orbit-midnight/50 px-2 py-0.5 rounded text-zi-muted capitalize">
          {subscription.plan_type}
        </span>
      </div>
    </div>
  )
}
