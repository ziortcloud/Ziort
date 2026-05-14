'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'

const C_BLUE = '#2d3bff'
const C_CYAN = '#00d4ff'
const INPUT_CLS =
  'w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2.5 ' +
  'text-sm text-white placeholder-slate-600 ' +
  'focus:outline-none focus:border-white/[0.25] transition'

function pwScore(pw: string): number {
  let s = 0
  if (pw.length >= 8)            s++
  if (pw.length >= 12)           s++
  if (/[A-Z]/.test(pw))         s++
  if (/[0-9]/.test(pw))         s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const PW_LEVELS = [
  { min: 1, hex: '#ef4444', label: 'Weak' },
  { min: 2, hex: '#f97316', label: 'Fair' },
  { min: 3, hex: '#eab308', label: 'Good' },
  { min: 4, hex: '#84cc16', label: 'Strong' },
  { min: 5, hex: '#22c55e', label: 'Excellent' },
]
const WIDTH_PCT = ['0%', '20%', '40%', '60%', '80%', '100%']

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = pwScore(password)
  const lvl   = [...PW_LEVELS].reverse().find(l => score >= l.min) ?? PW_LEVELS[0]
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: WIDTH_PCT[score], background: lvl.hex }} />
      </div>
      <p className="text-[10px]" style={{ color: lvl.hex }}>{lvl.label} password</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)
  const [hasToken,  setHasToken]  = useState(false)

  // Supabase passes the session in the URL hash after email link click.
  // We create a browser-side client to exchange the hash for a session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      setHasToken(true)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // Supabase client auto-handles the hash and establishes the session
      supabase.auth.getSession()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)  { setError('Passwords do not match'); return }
    setError(null); setLoading(true)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: sbError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (sbError) { setError(sbError.message); return }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 3000)
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
        <p className="text-[12px] text-slate-500">Choose a new password</p>
      </div>

      {/* Glass panel */}
      <div
        className="relative rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: 'rgba(8,12,28,0.85)', backdropFilter: 'blur(24px)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${C_CYAN}90, transparent)` }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${C_CYAN}18 0%, transparent 70%)` }} />

        <div className="relative p-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-3"
              >
                <div className="text-5xl">✅</div>
                <p className="text-white font-bold text-lg">Password updated!</p>
                <p className="text-[13px] text-slate-400">Redirecting you to sign in…</p>
              </motion.div>
            ) : !hasToken ? (
              <motion.div
                key="no-token"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-6 space-y-3"
              >
                <div className="text-4xl">⚠️</div>
                <p className="text-white font-semibold">Invalid or expired link</p>
                <p className="text-[13px] text-slate-400">This reset link has expired or was already used.</p>
                <button
                  onClick={() => router.push('/forgot-password')}
                  className="text-[12px] font-semibold hover:opacity-80 transition"
                  style={{ color: C_CYAN }}
                >
                  Request a new link →
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  New Password
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

                  {/* New password */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        autoFocus
                        className={`${INPUT_CLS} pr-10`}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className={INPUT_CLS}
                    />
                    {confirm && confirm !== password && (
                      <p className="text-[11px] text-red-400 mt-0.5">Passwords do not match</p>
                    )}
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
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                    {loading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-700 text-center mt-5">
            Ziort Terms &amp; Privacy
          </p>
        </div>
      </div>
    </div>
  )
}
