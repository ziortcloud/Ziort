'use client'
import { useSessionStore } from '@/ziorbitcore/store/session'
import { useAppointments } from '../hooks/use-appointments'

export default function AppointmentListPage() {
  const { session } = useSessionStore()
  const entityId = session?.activeEntity?.id ?? ''
  const sub = session?.activeSubscriptions.find(s => s.product_code === 'ZPLS')
  const today = new Date().toISOString().split('T')[0]
  const { data: appointments, isLoading } = useAppointments(entityId, sub?.id ?? '', today)

  if (!sub) {
    return (
      <div className="zi-card text-center py-12">
        <p className="text-zi-muted text-sm">ZiPulse subscription not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-zi-white">Appointments</h1>
          <p className="ref-code mt-0.5">{sub.ref_code} · Today: {today}</p>
        </div>
        <a href="/zipulse/appointments/new" className="btn-primary text-sm">
          + Book Appointment
        </a>
      </div>

      {isLoading ? (
        <div className="text-zi-muted text-sm">Loading…</div>
      ) : !appointments?.length ? (
        <div className="zi-card text-center py-12">
          <p className="text-zi-muted text-sm">No appointments today.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map(appt => (
            <AppointmentRow key={appt.id} appt={appt} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentRow({ appt }: {
  appt: { zi_code: string; ref_code: string; status: string; scheduled_at: string; appointment_type: string; fee_paise: number }
}) {
  const statusColor: Record<string, string> = {
    scheduled:   'text-zi-muted',
    confirmed:   'text-zi-cyan',
    in_progress: 'text-zi-gold',
    completed:   'text-green-400',
    cancelled:   'text-red-400',
    no_show:     'text-red-500',
  }
  const time = new Date(appt.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN')}`

  return (
    <div className="zi-card flex items-center gap-4 cursor-pointer hover:border-zi-blue/20 transition-all">
      <div className="text-zi-cyan font-display font-bold text-sm w-16 shrink-0">{time}</div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-zi-white text-sm capitalize">
          {appt.appointment_type.replace('_', ' ')}
        </p>
        <p className="ref-code">{appt.ref_code}</p>
      </div>
      <div className="text-zi-muted text-sm hidden sm:block">{fmt(appt.fee_paise)}</div>
      <span className={`text-xs font-display font-semibold capitalize ${statusColor[appt.status] ?? 'text-zi-muted'}`}>
        {appt.status.replace('_', ' ')}
      </span>
    </div>
  )
}
