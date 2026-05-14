import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Gem, Zap, ShoppingCart, Truck, Package2, Utensils, Heart, ShoppingBag,
  Building2, Wheat, Megaphone, ScanLine, Calculator, Receipt, FileText,
  Quote, BookOpen, Share2, ChevronDown, LogOut, User, Users, Check,
  ArrowRight, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../core/supabase'
import { useSession, useActiveSubscriptions, useSessionStore } from '../../core/store/session'
import { apiPost } from '../../core/api/client'
import type { ProductCode } from '../../core/types/core'
import Logo from '../../components/Logo'
import SpaceBackground from '../../components/SpaceBackground'

// ─── Product registry ─────────────────────────────────────────────────────────

interface ProductDef {
  code:      ProductCode
  name:      string
  tagline:   string
  desc:      string
  icon:      React.ElementType
  href:      string
  gradient:  string
  accent:    string
  features:  string[]
  available: boolean
}

const PRODUCTS: ProductDef[] = [
  {
    code: 'ZPN', name: 'ZiPawn', tagline: 'Gold & jewel pawn management',
    desc: 'Digital pawn tickets, live gold valuation, loan lifecycle & overdue alerts — built for Indian pawnbrokers.',
    icon: Gem, href: '/zipawn', gradient: 'from-indigo-500/20 to-blue-500/10', accent: '#6d6ade',
    features: ['Pawn Tickets', 'Gold Valuation', 'Loan Tracking', 'Overdue Alerts'],
    available: true,
  },
  {
    code: 'ZFLT', name: 'ZiFleet', tagline: 'Fleet & vehicle management',
    desc: 'Track vehicles, drivers and trips. Fuel logs, expense tracking and maintenance scheduling.',
    icon: Truck, href: '/zifleet', gradient: 'from-amber-500/20 to-orange-500/10', accent: '#f97316',
    features: ['Trip Management', 'Vehicle Tracking', 'Fuel Logs', 'Driver Records'],
    available: true,
  },
  {
    code: 'ZLD', name: 'ZiLoad', tagline: 'Goods transport & logistics',
    desc: 'Post loads, find trucks and match transporters across India — the open load board for shippers.',
    icon: Package2, href: '/ziload', gradient: 'from-emerald-500/20 to-teal-500/10', accent: '#10b981',
    features: ['Load Board', 'Bid System', 'Booking Management', 'Rate Cards'],
    available: true,
  },
  {
    code: 'ZDR', name: 'ZiDriver', tagline: 'Driver & pilot marketplace',
    desc: 'Find and hire professional drivers. Post availability, manage engagements and documents.',
    icon: Users, href: '/zidriver', gradient: 'from-purple-500/20 to-violet-500/10', accent: '#8b5cf6',
    features: ['Driver Profiles', 'Hire Drivers', 'Engagements', 'Document Vault'],
    available: true,
  },
  { code: 'ZPLS', name: 'ZiPulse',   tagline: 'CRM & sales pipeline',         icon: Zap,          href: '/zipulse',   gradient: 'from-violet-500/20 to-purple-500/10', accent: '#8b5cf6', desc: '', features: [], available: false },
  { code: 'ZND',  name: 'ZiNeed',    tagline: 'B2B procurement platform',     icon: ShoppingCart, href: '/zineed',    gradient: 'from-pink-500/20 to-rose-500/10',    accent: '#ec4899', desc: '', features: [], available: false },
  { code: 'ZFD',  name: 'ZiFood',    tagline: 'Restaurant & kitchen orders',  icon: Utensils,     href: '/zifood',    gradient: 'from-orange-500/20 to-amber-500/10', accent: '#f97316', desc: '', features: [], available: false },
  { code: 'ZCR',  name: 'ZiCare',    tagline: 'Clinic & patient management',  icon: Heart,        href: '/zicare',    gradient: 'from-red-500/20 to-rose-500/10',     accent: '#ef4444', desc: '', features: [], available: false },
  { code: 'ZSHP', name: 'ZiShop',    tagline: 'Retail POS & billing',         icon: ShoppingBag,  href: '/zishop',    gradient: 'from-lime-500/20 to-green-500/10',   accent: '#84cc16', desc: '', features: [], available: false },
  { code: 'ZCHT', name: 'ZiChit',    tagline: 'Chit fund & pigmy schemes',    icon: Gem,          href: '/zichit',    gradient: 'from-yellow-500/20 to-amber-500/10', accent: '#eab308', desc: '', features: [], available: false },
  { code: 'ZBLD', name: 'ZiBuild',   tagline: 'Real estate & project sales',  icon: Building2,    href: '/zibuild',   gradient: 'from-stone-500/20 to-slate-500/10',  accent: '#78716c', desc: '', features: [], available: false },
  { code: 'ZYLD', name: 'ZiYield',   tagline: 'Farm & crop management',       icon: Wheat,        href: '/ziyield',   gradient: 'from-green-500/20 to-emerald-500/10',accent: '#22c55e', desc: '', features: [], available: false },
  { code: 'ZPST', name: 'ZiPost',    tagline: 'Hyperlocal ads & listings',    icon: Megaphone,    href: '/zipost',    gradient: 'from-fuchsia-500/20 to-pink-500/10', accent: '#d946ef', desc: '', features: [], available: false },
  { code: 'ZSCN', name: 'ZiScan',    tagline: 'Document scanning & OCR',      icon: ScanLine,     href: '/ziscan',    gradient: 'from-blue-500/20 to-indigo-500/10',  accent: '#3b82f6', desc: '', features: [], available: false },
  { code: 'ZCLC', name: 'ZiCalc',    tagline: 'Project cost estimation',      icon: Calculator,   href: '/zicalc',    gradient: 'from-slate-500/20 to-gray-500/10',   accent: '#94a3b8', desc: '', features: [], available: false },
  { code: 'ZRCP', name: 'ZiReceipt', tagline: 'Digital receipts & billing',   icon: Receipt,      href: '/zireceipt', gradient: 'from-sky-500/20 to-cyan-500/10',     accent: '#0ea5e9', desc: '', features: [], available: false },
  { code: 'ZNVC', name: 'ZiInvoice', tagline: 'GST invoicing & tracking',     icon: FileText,     href: '/ziinvoice', gradient: 'from-violet-500/20 to-indigo-500/10',accent: '#7c3aed', desc: '', features: [], available: false },
  { code: 'ZQT',  name: 'ZiQuote',   tagline: 'Quotations & proposals',       icon: Quote,        href: '/ziquote',   gradient: 'from-amber-500/20 to-yellow-500/10', accent: '#f59e0b', desc: '', features: [], available: false },
  { code: 'ZLDG', name: 'ZiLedger',  tagline: 'Accounting & bookkeeping',     icon: BookOpen,     href: '/ziledger',  gradient: 'from-emerald-500/20 to-teal-500/10', accent: '#10b981', desc: '', features: [], available: false },
  { code: 'ZPRTN',name: 'ZiPartner', tagline: 'Referral & partner network',   icon: Share2,       href: '/zipartner', gradient: 'from-rose-500/20 to-pink-500/10',    accent: '#fb7185', desc: '', features: [], available: false },
]

const PRODUCT_MAP = new Map(PRODUCTS.map(p => [p.code, p]))
const AVAILABLE   = PRODUCTS.filter(p => p.available)

// ─── Root component ───────────────────────────────────────────────────────────

export default function ProductHubPage() {
  const navigate         = useNavigate()
  const session          = useSession()
  const subscriptions    = useActiveSubscriptions()
  const { clearSession } = useSessionStore()
  const [activating, setActivating] = useState<ProductCode | null>(null)
  const [showMore, setShowMore]     = useState(false)

  const subscribedCodes  = new Set(subscriptions.map(s => s.product_code))
  const subscribedDefs   = PRODUCTS.filter(p => subscribedCodes.has(p.code))
  const lastProduct      = PRODUCTS.find(p => p.code === session?.lastProductCode)
  const primary          = lastProduct ?? subscribedDefs[0]
  const others           = subscribedDefs.filter(p => p !== primary)
  const availableNotSub  = AVAILABLE.filter(p => !subscribedCodes.has(p.code))
  const comingSoon       = PRODUCTS.filter(p => !p.available)

  async function activateTrial(product: ProductDef) {
    const entityId = session?.activeEntity?.id
    if (!entityId) { toast.error('No active entity found. Please complete setup.'); return }
    setActivating(product.code)
    try {
      await apiPost(`/entities/${entityId}/subscriptions`, {
        product_code: product.code,
        plan_type:    'trial',
      })
      await useSessionStore.getState().loadSession()
      toast.success(`${product.name} activated! Starting your 180-day free trial.`)
      navigate(product.href)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || `Could not activate ${product.name}`)
    } finally {
      setActivating(null)
    }
  }

  async function openProduct(product: ProductDef) {
    useSessionStore.getState().setLastProduct(product.code)
    navigate(product.href)
  }

  async function signOut() {
    await supabase.auth.signOut()
    clearSession()
    navigate('/login', { replace: true })
  }

  const isActivating = (code: ProductCode) => activating === code

  // Auto-activate if user came from landing page "Start Free Trial"
  useEffect(() => {
    const intent = localStorage.getItem('zi_product_intent') as ProductCode | null
    if (!intent) return
    const product = PRODUCT_MAP.get(intent)
    if (!product?.available) { localStorage.removeItem('zi_product_intent'); return }
    if (subscribedCodes.has(intent)) { localStorage.removeItem('zi_product_intent'); navigate(product.href); return }
    localStorage.removeItem('zi_product_intent')
    activateTrial(product)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative min-h-screen bg-orbit-midnight overflow-hidden">
      <SpaceBackground />

      {/* ── Topbar ── */}
      <header className="relative z-10 h-14 flex items-center justify-between px-6 border-b border-white/5">
        <Logo size="sm" to="/hub" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-zi-muted hidden sm:block">
            {session?.individual.display_name}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md text-zi-muted hover:text-zi-white hover:bg-orbit-navy transition-colors">
              <User size={16} />
            </button>
            <button onClick={signOut}
              className="p-1.5 rounded-md text-zi-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-semibold text-zi-white">
            {subscriptions.length === 0 ? 'Welcome to Ziort,' : `Good ${getTimeOfDay()},`}{' '}
            <span className="text-zi-cyan">{session?.individual.display_name.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-zi-muted mt-1">
            {session?.activeEntity?.legal_name
              ? `${session.activeEntity.legal_name} · ${subscriptions.length} product${subscriptions.length !== 1 ? 's' : ''} active`
              : 'Pick a product below to get started'}
          </p>
        </motion.div>

        {/* ── FIRST-TIME USER: empty state ── */}
        {subscribedDefs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>

            {/* Onboarding banner */}
            <div className="mb-6 p-4 rounded-xl bg-zi-blue/10 border border-zi-blue/20 flex items-start gap-3">
              <Sparkles size={18} className="text-zi-cyan shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-zi-white">Start your free 180-day trial</p>
                <p className="text-xs text-zi-muted mt-0.5">
                  No credit card required. Choose any product below and get instant access.
                </p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-zi-muted mb-4">Choose a product to get started</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {AVAILABLE.map((p, i) => (
                <TrialCard key={p.code} product={p} delay={i * 0.06}
                  loading={isActivating(p.code)}
                  onActivate={() => activateTrial(p)} />
              ))}
            </div>

            <ComingSoonSection products={comingSoon} showMore={showMore} onToggle={() => setShowMore(v => !v)} />
          </motion.div>
        )}

        {/* ── RETURNING USER: subscribed products ── */}
        {primary && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zi-muted mb-3">Continue where you left off</p>
            <PrimaryCard product={primary} onOpen={() => openProduct(primary)} />
          </motion.div>
        )}

        {others.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-zi-muted mb-3">Your products</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {others.map((p, i) => (
                <SmallCard key={p.code} product={p} delay={i * 0.04} onOpen={() => openProduct(p)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Available products not yet subscribed */}
        {subscribedDefs.length > 0 && availableNotSub.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-zi-muted mb-3">Add more products — free trial</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {availableNotSub.map((p, i) => (
                <TrialCardSmall key={p.code} product={p} delay={i * 0.05}
                  loading={isActivating(p.code)}
                  onActivate={() => activateTrial(p)} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Coming soon (only shown for returning users) */}
        {subscribedDefs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <ComingSoonSection products={comingSoon} showMore={showMore} onToggle={() => setShowMore(v => !v)} />
          </motion.div>
        )}
      </main>
    </div>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

function PrimaryCard({ product, onOpen }: { product: ProductDef; onOpen: () => void }) {
  const Icon = product.icon
  return (
    <button onClick={onOpen}
      className={`w-full text-left p-6 rounded-2xl bg-gradient-to-br ${product.gradient}
                  border border-white/8 hover:border-white/15 transition-all duration-200
                  hover:scale-[1.01] group`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${product.accent}20`, boxShadow: `0 0 20px ${product.accent}15` }}>
            <Icon size={22} style={{ color: product.accent }} />
          </div>
          <div>
            <p className="text-xs text-zi-muted font-medium mb-0.5">Tap to open</p>
            <h3 className="text-xl font-bold text-zi-white">{product.name}</h3>
            <p className="text-sm text-zi-muted">{product.tagline}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
          <ArrowRight size={14} className="text-zi-muted group-hover:text-zi-white transition-colors" />
        </div>
      </div>
    </button>
  )
}

function SmallCard({ product, delay, onOpen }: { product: ProductDef; delay: number; onOpen: () => void }) {
  const Icon = product.icon
  return (
    <motion.button onClick={onOpen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`text-left p-4 rounded-xl bg-gradient-to-br ${product.gradient}
                  border border-white/8 hover:border-white/15 transition-all duration-150
                  hover:scale-[1.02] group`}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${product.accent}20` }}>
        <Icon size={17} style={{ color: product.accent }} />
      </div>
      <p className="text-sm font-semibold text-zi-white">{product.name}</p>
      <p className="text-[11px] text-zi-muted mt-0.5 line-clamp-1">{product.tagline}</p>
    </motion.button>
  )
}

function TrialCard({ product, delay, loading, onActivate }:
  { product: ProductDef; delay: number; loading: boolean; onActivate: () => void }) {
  const Icon = product.icon
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`p-5 rounded-2xl bg-gradient-to-br ${product.gradient}
                  border border-white/8 hover:border-white/15 transition-all duration-200`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${product.accent}20`, boxShadow: `0 0 16px ${product.accent}15` }}>
          <Icon size={20} style={{ color: product.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-zi-white">{product.name}</h3>
          <p className="text-[11px] text-zi-muted mt-0.5">{product.tagline}</p>
        </div>
      </div>

      <p className="text-xs text-zi-muted/80 mb-3 leading-relaxed">{product.desc}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {product.features.map(f => (
          <span key={f} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${product.accent}15`, color: product.accent }}>
            <Check size={8} /> {f}
          </span>
        ))}
      </div>

      <button onClick={onActivate} disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{ background: loading ? `${product.accent}80` : product.accent }}>
        {loading
          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Activating…</>
          : <>Start Free Trial <ArrowRight size={13} /></>}
      </button>
      <p className="text-center text-[10px] text-zi-muted/50 mt-1.5">180 days free · No credit card</p>
    </motion.div>
  )
}

function TrialCardSmall({ product, delay, loading, onActivate }:
  { product: ProductDef; delay: number; loading: boolean; onActivate: () => void }) {
  const Icon = product.icon
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${product.accent}15` }}>
        <Icon size={18} style={{ color: product.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zi-white">{product.name}</p>
        <p className="text-[11px] text-zi-muted line-clamp-1">{product.tagline}</p>
      </div>
      <button onClick={onActivate} disabled={loading}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-60 transition-colors"
        style={{ background: product.accent }}>
        {loading
          ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : 'Try Free'}
      </button>
    </motion.div>
  )
}

function ComingSoonSection({ products, showMore, onToggle }:
  { products: ProductDef[]; showMore: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zi-muted/60
                   hover:text-zi-muted transition-colors mb-3">
        {products.length} more products coming soon
        <ChevronDown size={12} className={`transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
      </button>
      {showMore && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {products.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div key={p.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-orbit-deep/50 border border-white/4">
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-orbit-navy">
                  <Icon size={12} className="text-zi-muted/50" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zi-muted/70 truncate">{p.name}</p>
                  <p className="text-[9px] text-zi-muted/35">Coming soon</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
