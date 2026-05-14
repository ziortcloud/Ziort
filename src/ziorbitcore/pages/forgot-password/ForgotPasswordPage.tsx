'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'

const C_BLUE = '#2d3bff'
const C_CYAN = '#00d4ff'
const INPUT_CLS =
  'w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2.5 ' +
  'text-sm text-white placeholder-slate-600 ' +
  'focus:outline-none focus:border-white/[0.25] transition'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setError(null); setLoading(true)
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setSent(true)
    else { const j = await res.json(); setError(j.error ?? 'Something went wrong') }
  }

  return (
    <div className="space-y-5">

      {/* Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke={C_CYAN} strokeWidth="1.2" opacity="0.3" />
            <circle cx="20" cy="20" r="11" fill={C_BLUE} opacity="0.9" />
            <circle cx="20" cy="20" r="5"  fill={C_CYAN} />
            <circle cx="20" cy="2.4" r="2.4" fill="#f5a623" />
          </svg>
          <span className="text-2xl font-display font-bold tracking-tight">
            <span style={{ color: C_CYAN }}>Zi</span>
            <span className="text-white">Orbit</span>
          </span>
        </div>
        <p className="text-[12px] text-slate-500">Reset your password</p>
      </div>

      {/* Glass panel */}
      <div
        className="relative rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: 'rgba(8,12,28,0.85)', backdropFilter: 'blur(24px)' }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${C_CYAN}90, transparent)` }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${C_CYAN}18 0%, transparent 70%)` }} />

        <div className="relative p-6">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-3"
              >
                <div className="text-5xl">📧</div>
                <p className="text-white font-bold text-lg">Check your inbox!</p>
                <p className="text-[13px] text-slate-400">
                  We sent a reset link to <strong className="text-white">{email}</strong>.
                  It expires in 1 hour.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="text-[12px] font-semibold hover:opacity-80 transition"
                  style={{ color: C_CYAN }}
                >
                  Back to sign in →
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Forgot Password
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        key={error}
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoFocus
                      autoComplete="email"
                      className={INPUT_CLS}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all
                               hover:opacity-90 active:scale-[0.98] disabled:opacity-40
                               flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${C_BLUE}dd, ${C_CYAN}99)`,
                      boxShadow:  `0 4px 20px ${C_BLUE}35`,
                    }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-400 transition"
                  >
                    <ArrowLeft size={12} /> Back to sign in
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-700 text-center mt-5">
            Free forever plan · No credit card required · Ziort Terms &amp; Privacy
          </p>
        </div>
      </div>
    </div>
  )
}
