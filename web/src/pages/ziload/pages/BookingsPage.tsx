import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useBookings } from '../hooks/useZiLoad'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
  DELIVERED:  'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function BookingsPage({ entityId, subscriptionId }: Props) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useBookings(entityId, subscriptionId, {
    status: statusFilter || undefined, limit: 50,
  })
  const bookings = data?.data ?? []

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Bookings</h1>
        <p className="text-xs text-zi-muted">{data?.meta?.total ?? 0} total bookings</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['','CONFIRMED','LOADING','IN_TRANSIT','DELIVERED','CLOSED','CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-green-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="p-12 rounded-xl bg-orbit-deep border border-white/5 text-center">
          <BookOpen size={36} className="text-zi-muted/30 mx-auto mb-3" />
          <p className="text-sm text-zi-muted">No bookings found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-orbit-deep border-b border-white/5">
                {['Booking','Route','Date','Status','Freight','Balance'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => {
                const freight  = (b.freight_paise  || 0) / 100
                const received = (b.received_paise || 0) / 100
                const balance  = freight - received
                return (
                  <tr key={b.id} onClick={() => navigate(`/ziload/bookings/${b.id}`)}
                    className="border-b border-white/3 hover:bg-orbit-deep cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-green-400">{b.zi_code}</td>
                    <td className="px-4 py-3 text-zi-white">
                      <p className="font-medium">{b.origin}</p>
                      <p className="text-xs text-zi-muted">→ {b.destination}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zi-muted">{b.created_at ? format(new Date(b.created_at), 'dd MMM') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[b.status] ?? STATUS_COLOR.CONFIRMED}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zi-white">₹{freight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 tabular-nums font-semibold ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
