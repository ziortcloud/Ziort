// Minimal dark-themed static pages: About, Contact, Privacy, Terms
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function StaticShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#030811] text-white">
      <header className="sticky top-0 z-50 bg-[#030811]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35"/>
              <circle cx="20" cy="20" r="11" fill="#6d6ade" opacity="0.9"/>
              <circle cx="20" cy="20" r="5" fill="#38bdf8"/>
              <circle cx="20" cy="2" r="3" fill="#f59e0b"/>
            </svg>
            <span className="font-bold text-lg tracking-tight">Ziort</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          {title}
        </h1>
        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed space-y-4">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/[0.05] px-4 py-6 text-center text-xs text-slate-700">
        © {new Date().getFullYear()} Ziort. All rights reserved.
      </footer>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────
export function AboutPage() {
  return (
    <StaticShell title="About Ziort">
      <p>
        Ziort is India's all-in-one business platform — one orbit, every tool. We build
        purpose-built software for Indian SMEs: pawn shops, kirana stores, clinics, restaurants,
        fleet operators, and more.
      </p>
      <p>
        Our mission is to make enterprise-grade software accessible to every business in India,
        starting free, with no credit card required. Each product is designed around the real
        workflows of Indian businesses — ₹ format, GST compliance, local language support, and
        offline-resilient architecture.
      </p>
      <p>
        Ziort is built by a team passionate about empowering the next 100 million Indian
        entrepreneurs with tools previously reserved for large corporations.
      </p>
    </StaticShell>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────
export function ContactPage() {
  return (
    <StaticShell title="Contact Us">
      <p>
        Have questions, feedback, or need support? We'd love to hear from you.
      </p>
      <div className="not-prose mt-6 space-y-4">
        {[
          { label: 'General Enquiries', value: 'hello@Ziort.in' },
          { label: 'Support', value: 'support@Ziort.in' },
          { label: 'Partnership', value: 'partners@Ziort.in' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-4 bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <a href={`mailto:${value}`} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                {value}
              </a>
            </div>
          </div>
        ))}
      </div>
    </StaticShell>
  )
}

// ─── Privacy ──────────────────────────────────────────────────────────────────
export function PrivacyPage() {
  return (
    <StaticShell title="Privacy Policy">
      <p className="text-slate-500 text-xs">Last updated: January 2025</p>
      <p>
        Ziort ("we", "our", "us") is committed to protecting your privacy. This policy
        explains what data we collect, how we use it, and the choices you have.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Information We Collect</h2>
      <p>
        We collect information you provide directly (name, email, phone, business details) and
        data generated from your use of our products (transaction records, loan data, inventory).
        All business data you enter belongs to you.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">How We Use Your Data</h2>
      <p>
        Your data is used solely to provide and improve our services. We do not sell your personal
        or business data to third parties. Business data is stored with row-level security —
        only your account can access it.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Data Security</h2>
      <p>
        All data is encrypted in transit (TLS) and at rest. We use Supabase's enterprise-grade
        infrastructure with Row Level Security policies ensuring strict data isolation.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Contact</h2>
      <p>
        For privacy concerns, email us at <a href="mailto:privacy@Ziort.in" className="text-emerald-400">privacy@Ziort.in</a>.
      </p>
    </StaticShell>
  )
}

// ─── Terms ────────────────────────────────────────────────────────────────────
export function TermsPage() {
  return (
    <StaticShell title="Terms of Service">
      <p className="text-slate-500 text-xs">Last updated: January 2025</p>
      <p>
        By accessing or using Ziort services, you agree to be bound by these Terms of Service.
        Please read them carefully.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Use of Services</h2>
      <p>
        You may use Ziort products for lawful business purposes only. You are responsible for
        maintaining the confidentiality of your account credentials and for all activities that
        occur under your account.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Free Trial & Billing</h2>
      <p>
        All products include a 90-day full-featured free trial. No credit card is required to
        start. After the trial period, continued access to premium features requires a paid
        subscription. Free-plan limits will be clearly communicated in the product.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Intellectual Property</h2>
      <p>
        Ziort and its product names, logos, and software are the intellectual property of
        Ziort Technologies. Your business data remains yours at all times.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Limitation of Liability</h2>
      <p>
        Ziort is provided "as is". We are not liable for indirect, incidental, or consequential
        damages arising from your use of our services.
      </p>
      <h2 className="text-base font-semibold text-white mt-6 mb-2">Contact</h2>
      <p>
        For legal enquiries, contact <a href="mailto:legal@Ziort.in" className="text-emerald-400">legal@Ziort.in</a>.
      </p>
    </StaticShell>
  )
}
