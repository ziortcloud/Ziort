import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
import { useBooking, useAdvanceBookingStatus, useBookingMessages, useSendMessage } from '../hooks/useZiLoad'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: 'LOADING', LOADING: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED', DELIVERED: 'CLOSED',
}
const NEXT_LABEL: Record<string, string> = {
  CONFIRMED: 'Start Loading', LOADING: 'Mark In Transit', IN_TRANSIT: 'Mark Delivered', DELIVERED: 'Close Booking',
}
const STATUS_COLOR: Record<string, string> = {
  CONFIRMED:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
  DELIVERED:  'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function BookingDetailPage({ entityId, subscriptionId }: Props) {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const [msgText, setMsgText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelNote, setCancelNote] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: booking, isLoading } = useBooking(entityId, subscriptionId, bookingId!)
  const { data: messages = [] }      = useBookingMessages(entityId, subscriptionId, bookingId!)
  const advanceStatus = useAdvanceBookingStatus(entityId, subscriptionId)
  const sendMessage   = useSendMessage(entityId, subscriptionId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) return (
    <div className="p-6"><div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-orbit-deep rounded-xl animate-pulse" />)}</div></div>
  )
  if (!booking) return <div className="p-6"><p className="text-zi-muted text-sm">Booking not found.</p></div>

  const freight  = (booking.freight_paise  || 0) / 100
  const received = (booking.received_paise || 0) / 100
  const balance  = freight - received
  const canAdvance = booking.status in NEXT_STATUS

  async function advance() {
    setSubmitting(true)
    try {
      await advanceStatus.mutateAsync({ bookingId: booking.id, body: { status: NEXT_STATUS[booking.status] } })
      toast.success(`Moved to ${NEXT_STATUS[booking.status].replace('_', ' ')}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Update failed')
    } finally { setSubmitting(false) }
  }

  async function cancel() {
    setSubmitting(true)
    try {
      await advanceStatus.mutateAsync({ bookingId: booking.id, body: { status: 'CANCELLED', note: cancelNote } })
      toast.success('Booking cancelled')
      setShowCancel(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed')
    } finally { setSubmitting(false) }
  }

  async function send() {
    if (!msgText.trim()) return
    setSubmitting(true)
    try {
      await sendMessage.mutateAsync({ bookingId: booking.id, body: { message: msgText.trim() } })
      setMsgText('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Send failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/ziload/bookings')} className="mt-0.5 text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-zi-white font-mono">{booking.zi_code}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[booking.status] ?? STATUS_COLOR.CONFIRMED}`}>
              {booking.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-zi-muted mt-0.5">{booking.origin} → {booking.destination}</p>
        </div>
        <div className="flex items-center gap-2">
          {booking.status !== 'CANCELLED' && booking.status !== 'CLOSED' && (
            <button onClick={() => setShowCancel(true)} className="px-3 py-1.5 bg-orbit-navy border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              Cancel
            </button>
          )}
          {canAdvance && (
            <button onClick={advance} disabled={submitting} className="px-4 py-1.5 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg text-xs font-medium text-white transition-colors">
              {submitting ? '…' : NEXT_LABEL[booking.status]}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Freight',  value: freight,  color: 'text-zi-white' },
          { label: 'Received', value: received, color: 'text-green-400' },
          { label: 'Balance',  value: balance,  color: balance > 0 ? 'text-red-400' : 'text-green-400' },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zi-muted mb-1">{k.label}</p>
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>₹{k.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Booking Info */}
        <div className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60 mb-3">Shipment Details</p>
          {booking.cargo_type    && <InfoRow label="Cargo"    value={booking.cargo_type} />}
          {booking.weight_tons   && <InfoRow label="Weight"   value={`${booking.weight_tons}T`} />}
          {booking.vehicle_type  && <InfoRow label="Vehicle"  value={booking.vehicle_type} />}
          {booking.lr_number     && <InfoRow label="LR No."   value={booking.lr_number} />}
          {booking.pickup_date   && <InfoRow label="Pickup"   value={format(new Date(booking.pickup_date), 'dd MMM yyyy')} />}
          {booking.delivery_date && <InfoRow label="Delivery" value={format(new Date(booking.delivery_date), 'dd MMM yyyy')} />}
          {booking.shipper_name  && <InfoRow label="Shipper"  value={booking.shipper_name} />}
          {booking.transporter_name && <InfoRow label="Transporter" value={booking.transporter_name} />}
        </div>

        {/* Chat */}
        <div className="rounded-xl bg-orbit-deep border border-white/5 flex flex-col h-80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60 p-4 pb-2">Messages</p>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-2">
            {messages.length === 0 ? (
              <p className="text-xs text-zi-muted text-center pt-8">No messages yet</p>
            ) : messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${m.is_mine ? 'bg-green-500/20 text-green-100' : 'bg-orbit-navy text-zi-white'}`}>
                  <p>{m.message}</p>
                  <p className="text-[9px] opacity-60 mt-0.5">{m.created_at ? format(new Date(m.created_at), 'hh:mm a') : ''}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {booking.status !== 'CLOSED' && booking.status !== 'CANCELLED' && (
            <div className="flex gap-2 p-3 border-t border-white/5">
              <input value={msgText} onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Type a message…"
                className="flex-1 px-3 py-1.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-green-400/40 transition-colors" />
              <button onClick={send} disabled={!msgText.trim() || submitting}
                className="p-1.5 bg-green-500 hover:bg-green-500/90 disabled:opacity-50 rounded-lg transition-colors">
                <Send size={14} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-base font-semibold text-zi-white">Cancel Booking</h2>
            <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">This will cancel the booking. Both parties will be notified.</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">Reason</label>
              <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white focus:outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCancel(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Keep</button>
              <button onClick={cancel} disabled={submitting} className="px-5 py-2 bg-red-500 hover:bg-red-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {submitting ? '…' : 'Cancel Booking'}
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
