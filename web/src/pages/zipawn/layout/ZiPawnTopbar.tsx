import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Calculator, UserPlus, ChevronRight, RefreshCw, X } from 'lucide-react'
import { format } from 'date-fns'

// ─── Metal prices ─────────────────────────────────────────────────────────────
interface MetalPrice { label: string; key: string; color: string }
const METALS: MetalPrice[] = [
  { label: 'Gold 24K', key: 'gold_24k',   color: '#fcd34d' },
  { label: 'Gold 22K', key: 'gold_22k',   color: '#fbbf24' },
  { label: 'Gold 18K', key: 'gold_18k',   color: '#f59e0b' },
  { label: 'Platinum', key: 'platinum',   color: '#94a3b8' },
  { label: 'Silver',   key: 'silver',     color: '#cbd5e1' },
]

const STORAGE_KEY = 'zi-metal-prices'

function loadPrices(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}
function savePrices(p: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

interface Props { entityId: string; subscriptionId: string }

export default function ZiPawnTopbar({ entityId, subscriptionId }: Props) {
  const navigate         = useNavigate()
  const [now, setNow]    = useState(new Date())
  const [prices, setPrices]       = useState<Record<string, number>>(loadPrices)
  const [showMetalPanel, setShowMetalPanel] = useState(false)
  const [showCalc, setShowCalc]   = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [overdueCount, setOverdueCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Clock — updates every 60s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ⌘K / Ctrl+K global search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(v => !v)
      }
      if (e.key === 'Escape') { setShowSearch(false); setShowMetalPanel(false); setShowCalc(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showSearch])

  function updatePrice(key: string, value: number) {
    const next = { ...prices, [key]: value }
    setPrices(next)
    savePrices(next)
  }

  return (
    <>
      <header className="h-14 flex items-center gap-3 px-4 border-b border-white/5 bg-orbit-deep">

        {/* Clock */}
        <div className="hidden sm:flex flex-col mr-2">
          <span className="text-xs font-semibold text-zi-white tabular-nums">{format(now, 'hh:mm a')}</span>
          <span className="text-[10px] text-zi-muted">{format(now, 'dd MMM yyyy')}</span>
        </div>

        {/* Metal prices bar */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-none [scrollbar-width:none]">
          {METALS.map(m => (
            <button key={m.key}
              onClick={() => setShowMetalPanel(true)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orbit-midnight/60
                         hover:bg-orbit-midnight border border-white/5 hover:border-white/10 transition-colors group">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <span className="text-[10px] text-zi-muted group-hover:text-zi-white transition-colors whitespace-nowrap">{m.label}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: m.color }}>
                {prices[m.key] ? `₹${prices[m.key].toLocaleString('en-IN')}` : '—'}
              </span>
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Overdue badge */}
          <button onClick={() => navigate(`/zipawn/loans?status=overdue`)}
            className="relative p-2 rounded-md text-zi-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Bell size={15} />
            {overdueCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white
                               flex items-center justify-center animate-pulse">
                {overdueCount > 9 ? '9+' : overdueCount}
              </span>
            )}
          </button>

          {/* Search */}
          <button onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-orbit-midnight/60 border border-white/5
                       hover:border-white/10 text-zi-muted hover:text-zi-white transition-colors text-xs">
            <Search size={13} />
            <span className="hidden lg:block">Search</span>
            <kbd className="hidden lg:flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-orbit-navy border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* Pawn Calculator */}
          <button onClick={() => setShowCalc(v => !v)}
            className={`p-2 rounded-md transition-colors ${showCalc ? 'bg-zi-blue/20 text-zi-blue' : 'text-zi-muted hover:text-zi-white hover:bg-orbit-navy'}`}
            title="Quick Pawn Calculator">
            <Calculator size={15} />
          </button>

          {/* Add Customer */}
          <button onClick={() => navigate('/zipawn/customers/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zi-blue hover:bg-zi-blue/90 rounded-md text-xs font-medium text-white transition-colors">
            <UserPlus size={13} />
            <span className="hidden sm:block">Add Customer</span>
          </button>
        </div>
      </header>

      {/* ── Metal price panel ──────────────────────────────────────────────── */}
      {showMetalPanel && (
        <MetalPricePanel prices={prices} onUpdate={updatePrice} onClose={() => setShowMetalPanel(false)} />
      )}

      {/* ── Quick Pawn Calculator ──────────────────────────────────────────── */}
      {showCalc && (
        <PawnCalculator prices={prices} onClose={() => setShowCalc(false)} />
      )}

      {/* ── Global search overlay ──────────────────────────────────────────── */}
      {showSearch && (
        <SearchOverlay inputRef={searchRef} onClose={() => setShowSearch(false)}
          entityId={entityId} subscriptionId={subscriptionId} />
      )}
    </>
  )
}

// ─── Metal Price Panel ────────────────────────────────────────────────────────
function MetalPricePanel({ prices, onUpdate, onClose }: {
  prices: Record<string, number>
  onUpdate: (key: string, val: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div className="bg-orbit-deep border border-white/10 rounded-2xl p-6 shadow-2xl w-96 max-w-[calc(100vw-2rem)]"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zi-white">Today's Metal Rates</h3>
          <button onClick={onClose} className="text-zi-muted hover:text-zi-white transition-colors">
            <X size={15} />
          </button>
        </div>
        <p className="text-xs text-zi-muted mb-4">Enter rates per gram (₹)</p>
        <div className="space-y-3">
          {METALS.map(m => (
            <div key={m.key} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
              <label className="text-xs text-zi-muted w-20 shrink-0">{m.label}</label>
              <input
                type="number"
                defaultValue={prices[m.key] || ''}
                onBlur={e => onUpdate(m.key, parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 px-3 py-1.5 bg-orbit-navy border border-white/8 rounded-md text-sm text-zi-white
                           tabular-nums focus:outline-none focus:border-zi-cyan/50 transition-colors"
              />
              <span className="text-xs text-zi-muted">/ g</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-zi-muted/60">Rates are saved locally and used in loan calculations</p>
      </div>
    </div>
  )
}

// ─── Quick Pawn Calculator ────────────────────────────────────────────────────
function PawnCalculator({ prices, onClose }: { prices: Record<string, number>; onClose: () => void }) {
  const [metal, setMetal]   = useState('gold_24k')
  const [weight, setWeight] = useState('')
  const [purity, setPurity] = useState('91.6')

  const rate     = prices[metal] || 0
  const wt       = parseFloat(weight) || 0
  const pct      = parseFloat(purity) / 100
  const mktValue = rate * wt * pct
  const loanAmt  = mktValue * 0.75

  return (
    <div className="absolute top-14 right-4 z-40 w-80 bg-orbit-deep border border-white/10 rounded-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zi-white">Quick Pawn Calculator</h3>
        <button onClick={onClose} className="text-zi-muted hover:text-zi-white transition-colors"><X size={14} /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-zi-muted uppercase tracking-widest mb-1 block">Metal</label>
          <select value={metal} onChange={e => setMetal(e.target.value)}
            className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                       focus:outline-none focus:border-zi-cyan/50 transition-colors">
            {METALS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zi-muted uppercase tracking-widest mb-1 block">Weight (g)</label>
            <input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="0.00"
              className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white tabular-nums
                         focus:outline-none focus:border-zi-cyan/50 transition-colors" />
          </div>
          <div>
            <label className="text-[10px] text-zi-muted uppercase tracking-widest mb-1 block">Purity %</label>
            <input value={purity} onChange={e => setPurity(e.target.value)} type="number" placeholder="91.6"
              className="w-full px-3 py-2 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white tabular-nums
                         focus:outline-none focus:border-zi-cyan/50 transition-colors" />
          </div>
        </div>
      </div>

      {mktValue > 0 && (
        <div className="mt-4 p-3 bg-orbit-midnight rounded-lg space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zi-muted">Market value</span>
            <span className="text-zi-white font-semibold tabular-nums">₹{mktValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zi-muted">Est. loan (75%)</span>
            <span className="text-zi-gold font-bold tabular-nums">₹{loanAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Search Overlay ───────────────────────────────────────────────────────────
function SearchOverlay({ inputRef, onClose, entityId, subscriptionId }: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
  entityId: string
  subscriptionId: string
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-orbit-midnight/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
         onClick={onClose}>
      <div className="w-full max-w-xl bg-orbit-deep border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search size={16} className="text-zi-muted shrink-0" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search customers, loans, tickets…"
            className="flex-1 bg-transparent text-sm text-zi-white placeholder:text-zi-muted focus:outline-none" />
          <button onClick={onClose} className="text-zi-muted hover:text-zi-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {q.length === 0 && (
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { label: 'New Loan',     action: () => navigate('/zipawn/tickets/new') },
              { label: 'Add Customer', action: () => navigate('/zipawn/customers/new') },
              { label: 'View Loans',   action: () => navigate('/zipawn/loans') },
              { label: 'Dashboard',    action: () => navigate('/zipawn/dashboard') },
            ].map(s => (
              <button key={s.label} onClick={() => { s.action(); onClose() }}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-orbit-navy hover:bg-orbit-midnight
                           text-sm text-zi-muted hover:text-zi-white transition-colors border border-white/5">
                {s.label}
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        )}

        {q.length > 0 && (
          <div className="p-4 text-sm text-zi-muted text-center py-8">
            Search for "<span className="text-zi-white">{q}</span>" — live search coming soon
          </div>
        )}
      </div>
    </div>
  )
}
