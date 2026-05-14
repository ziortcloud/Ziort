import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { LANDING_PRODUCTS, PRODUCT_MAP } from './data'
import ProductIcon from '../../components/ProductIcon'

// ─── Shared section wrapper ───────────────────────────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`py-20 px-4 sm:px-6 ${className}`}>{children}</section>
}
function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-6xl mx-auto ${className}`}>{children}</div>
}
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
      style={{ background: `${color}18`, borderColor: `${color}35`, color }}>
      {text}
    </span>
  )
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const product = slug ? PRODUCT_MAP.get(slug) : undefined

  if (!product) return <Navigate to="/" replace/>

  // Related products (same general category, exclude self)
  const related = LANDING_PRODUCTS.filter(p => p.slug !== product.slug).slice(0, 4)

  return (
    <div className="bg-orbit-midnight text-zi-white min-h-screen overflow-x-hidden">

      {/* ── Minimal top nav ── */}
      <nav className="sticky top-0 z-50 bg-orbit-midnight/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-zi-muted hover:text-zi-white transition-colors text-sm">
            <ArrowLeft size={14}/> Ziort
          </button>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-1.5 text-xs text-zi-muted hover:text-zi-white transition-colors">Sign In</Link>
            <Link to="/register" className="px-4 py-1.5 bg-zi-blue hover:bg-zi-blue/85 text-white text-xs font-semibold rounded-lg transition-all">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${product.glow} 0%, transparent 70%)` }}/>
          <div className="absolute inset-0 bg-orbit-midnight/60"/>
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
        </div>

        <Container className="relative z-10 text-center py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Badge */}
            {product.badge && (
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider"
                style={{ background: `${product.accent}18`, borderColor: `${product.accent}35`, color: product.accent }}>
                {product.badge}
              </div>
            )}
            {product.isLive && (
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> Live & Available
              </div>
            )}

            {/* Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl border mb-8 mx-auto"
              style={{ background: `${product.accent}15`, borderColor: `${product.accent}30` }}>
              <ProductIcon slug={product.slug} size={52}/>
            </div>

            {/* Name */}
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
              <span className="bg-gradient-to-br from-white via-white/90 to-white/60 bg-clip-text text-transparent">{product.name}</span>
            </h1>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl font-medium mb-4" style={{ color: product.accent }}>{product.tagline}</p>

            {/* Description */}
            <p className="text-zi-muted text-lg max-w-2xl mx-auto leading-relaxed mb-10">{product.subheadline}</p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
              <Link to="/register"
                className="flex items-center gap-2 px-7 py-3.5 font-bold text-white text-base rounded-xl transition-all shadow-xl active:scale-95"
                style={{ background: product.accent, boxShadow: `0 20px 60px -10px ${product.glow}` }}>
                Start 90-Day Free Trial <ArrowRight size={16}/>
              </Link>
              <a href="#features"
                className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zi-white font-medium text-base rounded-xl transition-all">
                See All Features <ChevronRight size={16}/>
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center flex-wrap gap-6">
              {product.stats.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-black" style={{ color: product.accent }}>{value}</p>
                  <p className="text-xs text-zi-muted">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ── Features ── */}
      <Section id="features" className="border-t border-white/5">
        <Container>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-zi-white mb-3">Everything {product.name} Does</h2>
            <p className="text-zi-muted text-lg">All the tools you need, designed specifically for your business.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {product.features.map(({ icon, title, desc }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}
                className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all group">
                <div className="text-2xl mb-4">{icon}</div>
                <h3 className="font-semibold text-zi-white mb-2 group-hover:text-zi-cyan transition-colors">{title}</h3>
                <p className="text-sm text-zi-muted leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Who it's for ── */}
      <Section className="border-t border-white/5 bg-gradient-to-b from-transparent to-orbit-deep/40">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-zi-white mb-3">Who Is {product.name} For?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {product.forWhom.map(({ who, icon, desc }, i) => (
              <motion.div key={who}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 text-center overflow-hidden group hover:border-white/[0.14] transition-all">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${product.glow} 0%, transparent 80%)` }}/>
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-lg font-semibold text-zi-white mb-2">{who}</h3>
                  <p className="text-sm text-zi-muted leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── How it works ── */}
      <Section className="border-t border-white/5">
        <Container>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-zi-white mb-3">How {product.name} Works</h2>
            <p className="text-zi-muted">Get started in minutes with no training required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${product.accent}40, transparent)` }}/>
            {product.steps.map(({ n, title, desc }, i) => (
              <motion.div key={n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.13 }}
                className="text-center relative">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border mb-6"
                  style={{ background: `${product.accent}15`, borderColor: `${product.accent}35` }}>
                  <span className="text-3xl font-black" style={{ color: product.accent }}>0{n}</span>
                </div>
                <h3 className="text-lg font-semibold text-zi-white mb-3">{title}</h3>
                <p className="text-sm text-zi-muted leading-relaxed max-w-xs mx-auto">{desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Pricing ── */}
      <Section className="border-t border-white/5 bg-gradient-to-b from-orbit-deep/40 to-transparent">
        <Container>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-zi-white mb-3">Simple, Honest Pricing</h2>
            <p className="text-zi-muted text-lg">Start free. Upgrade when ready. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Trial */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 relative">
              <div className="mb-4">
                <p className="text-sm text-zi-muted mb-1">Trial</p>
                <p className="text-4xl font-black text-zi-white">₹0</p>
                <p className="text-sm text-zi-muted mt-1">for 90 days</p>
              </div>
              <ul className="space-y-2.5 mb-7 text-sm text-zi-muted">
                {['All features unlocked','Unlimited users','No credit card','Full support'].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0"/>{f}</li>
                ))}
              </ul>
              <Link to="/register" className="block w-full text-center py-2.5 border border-white/10 hover:border-white/20 rounded-xl text-sm text-zi-white font-medium transition-all">
                Start Free Trial
              </Link>
            </motion.div>

            {/* Monthly */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="relative rounded-2xl p-7 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${product.accent}18 0%, ${product.glow} 30%, transparent 70%)`, border: `1px solid ${product.accent}40` }}>
              <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ background: product.accent }}>Popular</div>
              <div className="mb-4">
                <p className="text-sm text-zi-muted mb-1">Monthly</p>
                <p className="text-4xl font-black text-zi-white">₹999</p>
                <p className="text-sm text-zi-muted mt-1">per month</p>
              </div>
              <ul className="space-y-2.5 mb-7 text-sm text-zi-muted">
                {['Everything in Trial','Priority support','Data export','Custom branding'].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0"/>{f}</li>
                ))}
              </ul>
              <Link to="/register" className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: product.accent }}>
                Get Started
              </Link>
            </motion.div>

            {/* Annual */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 relative">
              <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Save 2 Months</div>
              <div className="mb-4">
                <p className="text-sm text-zi-muted mb-1">Annual</p>
                <p className="text-4xl font-black text-zi-white">₹9,999</p>
                <p className="text-sm text-zi-muted mt-1">per year</p>
              </div>
              <ul className="space-y-2.5 mb-7 text-sm text-zi-muted">
                {['Everything in Monthly','2 months free','Dedicated support','Early access features'].map(f => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400 shrink-0"/>{f}</li>
                ))}
              </ul>
              <Link to="/register" className="block w-full text-center py-2.5 border border-white/10 hover:border-white/20 rounded-xl text-sm text-zi-white font-medium transition-all">
                Go Annual
              </Link>
            </motion.div>
          </div>
          <p className="text-center text-xs text-zi-muted mt-6">All plans include GST billing, 24/7 cloud access and Indian language support.</p>
        </Container>
      </Section>

      {/* ── Final CTA ── */}
      <Section className="border-t border-white/5">
        <Container>
          <div className="relative rounded-3xl overflow-hidden p-10 sm:p-14 text-center"
            style={{ background: `linear-gradient(135deg, ${product.accent}14 0%, transparent 60%)`, border: `1px solid ${product.accent}25` }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${product.glow} 0%, transparent 70%)` }}/>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-zi-white mb-4">
                Ready to Try {product.name}?
              </h2>
              <p className="text-zi-muted text-lg mb-8 max-w-lg mx-auto">
                90 days free. No credit card. Full access. Start today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/register"
                  className="flex items-center gap-2 px-7 py-3.5 font-bold text-white text-base rounded-xl transition-all shadow-xl active:scale-95"
                  style={{ background: product.accent, boxShadow: `0 16px 50px -8px ${product.glow}` }}>
                  Start Free Trial <ArrowRight size={16}/>
                </Link>
                <button onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zi-muted hover:text-zi-white font-medium text-base rounded-xl transition-all">
                  <ArrowLeft size={14}/> All Products
                </button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Other products ── */}
      <Section className="border-t border-white/5 pb-24">
        <Container>
          <div className="text-center mb-10">
            <h3 className="text-xl font-semibold text-zi-white mb-1">Explore More Ziort Products</h3>
            <p className="text-sm text-zi-muted">One login. 19 products. Endless possibilities.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(p => (
              <Link key={p.code} to={`/product/${p.slug}`}
                className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-5 transition-all text-center">
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: `${p.accent}15`, border: `1px solid ${p.accent}30` }}>
                  <ProductIcon slug={p.slug} size={22}/>
                </div>
                <p className="text-sm font-semibold text-zi-white group-hover:text-zi-cyan transition-colors">{p.name}</p>
                <p className="text-[10px] text-zi-muted mt-0.5">{p.tagline}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/" className="text-sm text-zi-blue hover:text-zi-cyan transition-colors flex items-center gap-1 justify-center">
              View all 19 products <ArrowRight size={12}/>
            </Link>
          </div>
        </Container>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4"/>
            <circle cx="14" cy="14" r="7.5" fill="#6d6ade" opacity="0.95"/>
            <circle cx="14" cy="14" r="3.5" fill="#38bdf8"/>
            <circle cx="14" cy="2.5" r="2.5" fill="#f59e0b"/>
          </svg>
          <span className="text-sm font-bold"><span className="text-zi-cyan">Zi</span><span className="text-zi-white">Orbit</span></span>
        </div>
        <p className="text-xs text-zi-muted/50">© 2026 Ziort · <Link to="/" className="hover:text-zi-muted">All Products</Link> · 🇮🇳 Made in India</p>
      </footer>
    </div>
  )
}
