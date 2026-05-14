import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, X, Check, Plus, Fuel, CreditCard, Clock, AlertCircle } from 'lucide-react'
import { useTrip, useAdvanceTripStatus, useAddTripExpense, useAddFuelLog, useAddTripPayment } from '../hooks/useZiFleet'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Props { entityId: string; subscriptionId: string }

const STATUS_ORDER = ['CREATED','LOADING','IN_TRANSIT','DELIVERED','CLOSED']
const NEXT_STATUS: Record<string, string> = {
  CREATED: 'LOADING', LOADING: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED', DELIVERED: 'CLOSED',
}
const STATUS_COLOR: Record<string, string> = {
  CREATED:    'bg-white/5 text-zi-muted border-white/10',
  LOADING:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_TRANSIT: 'bg-green-500/15 text-green-400 border-green-500/20',
  DELIVERED:  'bg-sky-500/15 text-sky-400 border-sky-500/20',
  CLOSED:     'bg-zi-muted/15 text-zi-muted border-zi-muted/20',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/20',
}
const NEXT_LABEL: Record<string, string> = {
  CREATED: 'Start Loading', LOADING: 'Mark In Transit', IN_TRANSIT: 'Mark Delivered', DELIVERED: 'Close Trip',
}

const EXPENSE_CATS = ['TOLL','LOADING_CHARGE','UNLOADING_CHARGE','VEHICLE_REPAIR','DRIVER_ALLOWANCE','POLICE_FINE','PARKING','OTHER']
const PAYMENT_MODES = ['CASH','UPI','BANK_TRANSFER','CHEQUE']

export default function TripDetailPage({ entityId, subscriptionId }: Props) {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate   = useNavigate()
  const [tab, setTab] = useState<'expenses'|'fuel'|'payments'|'timeline'>('expenses')
  const [showExpense,  setShowExpense]  = useState(false)
  const [showFuel,     setShowFuel]     = useState(false)
  const [showPayment,  setShowPayment]  = useState(false)
  const [showCancel,   setShowCancel]   = useState(false)
  const [cancelNote,   setCancelNote]   = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  const { data: trip, isLoading } = useTrip(entityId, subscriptionId, tripId!)
  const advanceStatus = useAdvanceTripStatus(entityId, subscriptionId)
  const addExpense    = useAddTripExpense(entityId, subscriptionId)
  const addFuel       = useAddFuelLog(entityId, subscriptionId)
  const addPayment    = useAddTripPayment(entityId, subscriptionId)

  // Expense form
  const [expense, setExpense] = useState({ category: 'TOLL', description: '', amount: '', paid_by: 'DRIVER', receipt_url: '' })
  // Fuel form
  const [fuel, setFuel] = useState({ liters: '', amount_paise_str: '', odometer: '', station: '' })
  // Payment form
  const [payment, setPayment] = useState({ amount: '', mode: 'CASH', reference: '', note: '' })

  if (isLoading) return (
    <div className="p-6">
      <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-orbit-deep rounded-xl animate-pulse" />)}</div>
    </div>
  )
  if (!trip) return (
    <div className="p-6"><p className="text-zi-muted text-sm">Trip not found.</p></div>
  )

  const freight   = (trip.freight_paise  || 0) / 100
  const received  = (trip.received_paise || 0) / 100
  const expenses  = (trip.expenses_paise || 0) / 100
  const balance   = freight - received
  const netProfit = received - expenses

  const canAdvance = trip.status in NEXT_STATUS
  const nextStatus = NEXT_STATUS[trip.status]

  async function advance() {
    if (!canAdvance) return
    setSubmitting(true)
    try {
      await advanceStatus.mutateAsync({ tripId: trip.id, body: { status: nextStatus } })
      toast.success(`Trip moved to ${nextStatus.replace('_', ' ')}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Update failed')
    } finally { setSubmitting(false) }
  }

  async function cancel() {
    setSubmitting(true)
    try {
      await advanceStatus.mutateAsync({ tripId: trip.id, body: { status: 'CANCELLED', note: cancelNote } })
      toast.success('Trip cancelled')
      setShowCancel(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Cancel failed')
    } finally { setSubmitting(false) }
  }

  async function saveExpense() {
    if (!expense.amount) return
    setSubmitting(true)
    try {
      await addExpense.mutateAsync({ tripId: trip.id, body: {
        category: expense.category,
        description: expense.description || undefined,
        amount_paise: Math.round(parseFloat(expense.amount) * 100),
        paid_by: expense.paid_by,
        receipt_url: expense.receipt_url || undefined,
      }})
      toast.success('Expense added')
      setShowExpense(false)
      setExpense({ category: 'TOLL', description: '', amount: '', paid_by: 'DRIVER', receipt_url: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSubmitting(false) }
  }

  async function saveFuel() {
    if (!fuel.liters || !fuel.amount_paise_str) return
    setSubmitting(true)
    try {
      await addFuel.mutateAsync({ tripId: trip.id, body: {
        liters:       parseFloat(fuel.liters),
        amount_paise: Math.round(parseFloat(fuel.amount_paise_str) * 100),
        odometer:     fuel.odometer ? parseInt(fuel.odometer) : undefined,
        station:      fuel.station  || undefined,
      }})
      toast.success('Fuel log added')
      setShowFuel(false)
      setFuel({ liters: '', amount_paise_str: '', odometer: '', station: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSubmitting(false) }
  }

  async function savePayment() {
    if (!payment.amount) return
    setSubmitting(true)
    try {
      await addPayment.mutateAsync({ tripId: trip.id, body: {
        amount_paise: Math.round(parseFloat(payment.amount) * 100),
        mode:         payment.mode,
        reference:    payment.reference || undefined,
        note:         payment.note      || undefined,
      }})
      toast.success('Payment recorded')
      setShowPayment(false)
      setPayment({ amount: '', mode: 'CASH', reference: '', note: '' })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally { setSubmitting(false) }
  }

  const ic = 'w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-orange-400/40 transition-colors'

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/zifleet/trips')} className="mt-0.5 text-zi-muted hover:text-zi-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-zi-white font-mono">{trip.zi_code}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${STATUS_COLOR[trip.status] ?? STATUS_COLOR.CREATED}`}>
              {trip.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-zi-muted mt-0.5">{trip.origin} → {trip.destination}</p>
        </div>
        <div className="flex items-center gap-2">
          {trip.status !== 'CANCELLED' && trip.status !== 'CLOSED' && (
            <button onClick={() => setShowCancel(true)} className="px-3 py-1.5 bg-orbit-navy border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              Cancel Trip
            </button>
          )}
          {canAdvance && (
            <button onClick={advance} disabled={submitting} className="px-4 py-1.5 bg-orange-500 hover:bg-orange-500/90 disabled:opacity-50 rounded-lg text-xs font-medium text-white transition-colors">
              {submitting ? '…' : NEXT_LABEL[trip.status]}
            </button>
          )}
        </div>
      </div>

      {/* Status Progress */}
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const idx    = STATUS_ORDER.indexOf(trip.status)
          const done   = i < idx || (trip.status === 'CLOSED' && i <= 4)
          const active = s === trip.status
          return (
            <div key={s} className="flex items-center flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${done ? 'bg-orange-500' : active ? 'bg-orange-500/50' : 'bg-white/8'}`} />
              {i < STATUS_ORDER.length - 1 && <div className="w-1" />}
            </div>
          )
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Freight',    value: freight,   color: 'text-zi-white' },
          { label: 'Received',   value: received,  color: 'text-green-400' },
          { label: 'Expenses',   value: expenses,  color: 'text-red-400' },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-xl bg-orbit-deep border border-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zi-muted mb-1">{k.label}</p>
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>₹{k.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        ))}
      </div>

      {/* Trip Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60">Route & Cargo</p>
          <InfoRow label="Origin"      value={trip.origin} />
          <InfoRow label="Destination" value={trip.destination} />
          {trip.cargo_type    && <InfoRow label="Cargo"     value={trip.cargo_type} />}
          {trip.cargo_weight  && <InfoRow label="Weight"    value={`${trip.cargo_weight} tons`} />}
          {trip.lr_number     && <InfoRow label="LR No."    value={trip.lr_number} />}
          {trip.invoice_value && <InfoRow label="Invoice"   value={`₹${(trip.invoice_value/100).toLocaleString('en-IN')}`} />}
        </div>
        <div className="p-4 rounded-xl bg-orbit-deep border border-white/5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zi-muted/60">Assignment</p>
          {trip.zft_vehicles && <InfoRow label="Vehicle" value={`${trip.zft_vehicles.reg_number} (${trip.zft_vehicles.vehicle_type})`} />}
          {trip.zft_drivers  && <InfoRow label="Driver"  value={trip.zft_drivers.full_name} />}
          {trip.client_name  && <InfoRow label="Client"  value={trip.client_name} />}
          {trip.client_mobile && <InfoRow label="Mobile" value={`****${trip.client_mobile}`} />}
          {trip.notes        && <InfoRow label="Notes"   value={trip.notes} />}
          <InfoRow label="Balance Due" value={`₹${balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} valueClass={balance > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'} />
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-4">
          {(['expenses','fuel','payments','timeline'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${tab === t ? 'bg-orange-500 text-white' : 'bg-orbit-deep border border-white/8 text-zi-muted hover:text-zi-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {tab === 'expenses' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowExpense(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/20 rounded-lg text-xs text-orange-400 hover:bg-orange-500/25 transition-colors">
                <Plus size={12} /> Add Expense
              </button>
            </div>
            {(trip.trip_expenses ?? []).length === 0 ? (
              <EmptyState label="No expenses logged" />
            ) : (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orbit-deep border-b border-white/5">
                      {['Category','Description','Amount','Paid By','Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trip.trip_expenses.map((e: any) => (
                      <tr key={e.id} className="border-b border-white/3">
                        <td className="px-4 py-2.5 text-xs font-medium text-zi-white">{e.category.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{e.description ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs tabular-nums text-zi-white">₹{((e.amount_paise || 0)/100).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{e.paid_by}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{e.created_at ? format(new Date(e.created_at), 'dd MMM') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fuel tab */}
        {tab === 'fuel' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowFuel(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/20 rounded-lg text-xs text-orange-400 hover:bg-orange-500/25 transition-colors">
                <Fuel size={12} /> Add Fuel Log
              </button>
            </div>
            {(trip.fuel_logs ?? []).length === 0 ? (
              <EmptyState label="No fuel logs recorded" />
            ) : (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orbit-deep border-b border-white/5">
                      {['Liters','Amount','Odometer','Station','Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trip.fuel_logs.map((f: any) => (
                      <tr key={f.id} className="border-b border-white/3">
                        <td className="px-4 py-2.5 text-xs text-zi-white tabular-nums">{f.liters}L</td>
                        <td className="px-4 py-2.5 text-xs text-zi-white tabular-nums">₹{((f.amount_paise || 0)/100).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{f.odometer ? `${f.odometer} km` : '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{f.station ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{f.created_at ? format(new Date(f.created_at), 'dd MMM') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payments tab */}
        {tab === 'payments' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowPayment(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 border border-orange-500/20 rounded-lg text-xs text-orange-400 hover:bg-orange-500/25 transition-colors">
                <CreditCard size={12} /> Record Payment
              </button>
            </div>
            {(trip.trip_payments ?? []).length === 0 ? (
              <EmptyState label="No payments recorded" />
            ) : (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-orbit-deep border-b border-white/5">
                      {['Amount','Mode','Reference','Note','Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zi-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trip.trip_payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-white/3">
                        <td className="px-4 py-2.5 text-xs font-semibold text-green-400 tabular-nums">₹{((p.amount_paise || 0)/100).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-white">{p.mode}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{p.reference ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{p.note ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-zi-muted">{p.created_at ? format(new Date(p.created_at), 'dd MMM') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Timeline tab */}
        {tab === 'timeline' && (
          <div className="space-y-2">
            {(trip.status_history ?? []).length === 0 ? (
              <EmptyState label="No status history" />
            ) : (
              trip.status_history.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-orbit-deep border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zi-white">{h.status?.replace('_', ' ')}</p>
                    {h.note && <p className="text-[11px] text-zi-muted mt-0.5">{h.note}</p>}
                    <p className="text-[10px] text-zi-muted/60 mt-0.5">{h.changed_at ? format(new Date(h.changed_at), 'dd MMM yyyy, hh:mm a') : '—'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpense && (
        <Modal title="Add Expense" onClose={() => setShowExpense(false)}>
          <div className="space-y-3">
            <Fld label="Category">
              <select value={expense.category} onChange={e => setExpense(p => ({ ...p, category: e.target.value }))} className={ic}>
                {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </Fld>
            <Fld label="Description"><input value={expense.description} onChange={e => setExpense(p => ({ ...p, description: e.target.value }))} className={ic} /></Fld>
            <Fld label="Amount (₹) *"><input type="number" step="0.01" value={expense.amount} onChange={e => setExpense(p => ({ ...p, amount: e.target.value }))} className={ic} /></Fld>
            <Fld label="Paid By">
              <select value={expense.paid_by} onChange={e => setExpense(p => ({ ...p, paid_by: e.target.value }))} className={ic}>
                {['DRIVER','COMPANY','OWNER'].map(v => <option key={v}>{v}</option>)}
              </select>
            </Fld>
          </div>
          <ModalFooter onClose={() => setShowExpense(false)} onSave={saveExpense} saving={submitting} />
        </Modal>
      )}

      {/* Fuel Modal */}
      {showFuel && (
        <Modal title="Add Fuel Log" onClose={() => setShowFuel(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Liters *"><input type="number" step="0.1" value={fuel.liters} onChange={e => setFuel(p => ({ ...p, liters: e.target.value }))} placeholder="45.5" className={ic} /></Fld>
            <Fld label="Amount (₹) *"><input type="number" step="1" value={fuel.amount_paise_str} onChange={e => setFuel(p => ({ ...p, amount_paise_str: e.target.value }))} placeholder="3500" className={ic} /></Fld>
            <Fld label="Odometer (km)"><input type="number" value={fuel.odometer} onChange={e => setFuel(p => ({ ...p, odometer: e.target.value }))} className={ic} /></Fld>
            <Fld label="Station"><input value={fuel.station} onChange={e => setFuel(p => ({ ...p, station: e.target.value }))} className={ic} /></Fld>
          </div>
          <ModalFooter onClose={() => setShowFuel(false)} onSave={saveFuel} saving={submitting} />
        </Modal>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <Modal title="Record Payment" onClose={() => setShowPayment(false)}>
          <div className="space-y-3">
            <Fld label="Amount (₹) *"><input type="number" step="1" value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))} className={ic} /></Fld>
            <Fld label="Mode">
              <select value={payment.mode} onChange={e => setPayment(p => ({ ...p, mode: e.target.value }))} className={ic}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Fld>
            <Fld label="Reference / UTR"><input value={payment.reference} onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))} className={ic} /></Fld>
            <Fld label="Note"><input value={payment.note} onChange={e => setPayment(p => ({ ...p, note: e.target.value }))} className={ic} /></Fld>
          </div>
          <ModalFooter onClose={() => setShowPayment(false)} onSave={savePayment} saving={submitting} />
        </Modal>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <Modal title="Cancel Trip" onClose={() => setShowCancel(false)}>
          <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg mb-4">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">This will mark the trip as CANCELLED. This action cannot be undone.</p>
          </div>
          <Fld label="Reason (optional)">
            <textarea value={cancelNote} onChange={e => setCancelNote(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white placeholder:text-zi-muted/40 focus:outline-none focus:border-red-400/40 transition-colors resize-none" />
          </Fld>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowCancel(false)} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Keep Trip</button>
            <button onClick={cancel} disabled={submitting} className="px-5 py-2 bg-red-500 hover:bg-red-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
              {submitting ? '…' : 'Cancel Trip'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value, valueClass = 'text-zi-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] text-zi-muted shrink-0">{label}</span>
      <span className={`text-xs text-right ${valueClass}`}>{value}</span>
    </div>
  )
}
function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-8 rounded-xl bg-orbit-deep border border-white/5 text-center">
      <Clock size={28} className="text-zi-muted/30 mx-auto mb-2" />
      <p className="text-sm text-zi-muted">{label}</p>
    </div>
  )
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-orbit-deep border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-base font-semibold text-zi-white">{title}</h2>
          <button onClick={onClose} className="text-zi-muted hover:text-zi-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}
function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-3 mt-2">
      <button onClick={onClose} className="px-4 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-muted hover:text-zi-white transition-colors">Cancel</button>
      <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-500/90 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={13} /> Save</>}
      </button>
    </div>
  )
}
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-semibold text-zi-muted uppercase tracking-wider mb-1.5">{label}</label>{children}</div>
}
