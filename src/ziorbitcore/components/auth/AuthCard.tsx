'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, RegisterSchema, type LoginInput, type RegisterInput } from '../../validators/auth'
import { createZiortBrowserClient } from '../../db/browser-client'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C_BLUE = '#2d3bff'
const C_CYAN = '#00d4ff'
const C_GOLD = '#f5a623'

const GLASS_BG   = 'rgba(5, 7, 20, 0.88)'
const GLASS_BLUR = 'blur(32px)'

const INPUT_CLS =
  'w-full text-sm text-white placeholder-slate-700 ' +
  'bg-white/[0.03] border border-white/[0.08] rounded-xl ' +
  'px-3.5 py-2.5 focus:outline-none transition-all duration-200'

// ─── Password strength ────────────────────────────────────────────────────────
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
const W = ['0%', '20%', '40%', '60%', '80%', '100%']

function PasswordStrength({ pw }: { pw: string }) {
  if (!pw) return null
  const score = pwScore(pw)
  const lvl   = [...PW_LEVELS].reverse().find(l => score >= l.min) ?? PW_LEVELS[0]
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: W[score], background: lvl.hex, boxShadow: `0 0 8px ${lvl.hex}80` }}
        />
      </div>
      <p className="text-[10px] font-medium" style={{ color: lvl.hex }}>{lvl.label} password</p>
    </div>
  )
}

// ─── Animated banner ──────────────────────────────────────────────────────────
function Banner({ msg, ok }: { msg: string | null; ok?: boolean }) {
  const cls = ok
    ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10'
    : 'text-red-300 border-red-500/25 bg-red-500/10'
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          key={msg}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`text-[12px] border rounded-xl px-3 py-2 overflow-hidden ${cls}`}
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

// ─── Glowing input wrapper ────────────────────────────────────────────────────
const GlowInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: React.ReactNode }
>(function GlowInput({ label, error, suffix, onFocus, onBlur, className: _cls, ...props }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div
        className="relative rounded-xl transition-all duration-300"
        style={{
          boxShadow: focused
            ? `0 0 0 1px ${C_CYAN}50, 0 0 16px ${C_CYAN}15`
            : '0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <input
          {...props}
          ref={ref}
          onFocus={e => { setFocused(true); onFocus?.(e) }}
          onBlur={e  => { setFocused(false); onBlur?.(e) }}
          className={`${INPUT_CLS} ${suffix ? 'pr-11' : ''}`}
          style={{ boxShadow: focused ? `inset 0 0 20px ${C_CYAN}06` : undefined }}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
})

// ─── Shimmer gradient button ──────────────────────────────────────────────────
function GlowBtn({ loading, label, loadingLabel, icon: Icon }: {
  loading: boolean; label: string; loadingLabel: string; icon: React.ElementType
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="relative w-full py-3 rounded-xl text-sm font-bold text-white overflow-hidden
                 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
      style={{
        background: `linear-gradient(135deg, ${C_BLUE} 0%, #4f46e5 40%, ${C_CYAN}cc 100%)`,
        boxShadow:  `0 4px 24px ${C_BLUE}50, 0 1px 0 rgba(255,255,255,0.12) inset`,
      }}
    >
      {/* Shimmer sweep */}
      <span
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
          animation: 'shimmer-x 3s linear infinite',
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
        {loading ? loadingLabel : label}
      </span>
    </button>
  )
}

// ─── Eye-toggle button ────────────────────────────────────────────────────────
function EyeBtn({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="text-slate-600 hover:text-slate-300 transition-colors"
    >
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  )
}

// ─── Sign-In form ─────────────────────────────────────────────────────────────
function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter()
  const [err,       setErr]       = useState<string | null>(null)
  const [resetMsg,  setResetMsg]  = useState<string | null>(null)
  const [showPw,    setShowPw]    = useState(false)
  const [resetting, setResetting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  const emailVal = watch('email') ?? ''

  const onSubmit = async (data: LoginInput) => {
    setErr(null)
    const res  = await fetch('/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      if (json.error === 'SETUP_REQUIRED') {
        setErr('Your account is incomplete. Please register again to finish setup.')
      } else {
        setErr(json.error ?? 'Login failed')
      }
      return
    }

    // Establish the browser-side Supabase session (sets cookies the middleware reads).
    // Without this the middleware sees no cookie and redirects back to /login.
    const supabase = createZiortBrowserClient()
    await supabase.auth.setSession({
      access_token:  json.data.access_token,
      refresh_token: json.data.refresh_token,
    })

    router.push('/dashboard')
  }

  const forgotPassword = async () => {
    if (!emailVal) { setErr('Enter your email first'); return }
    setErr(null); setResetMsg(null); setResetting(true)
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal }),
    })
    setResetting(false)
    if (res.ok) setResetMsg('Reset link sent — check your inbox!')
    else { const j = await res.json(); setErr(j.error ?? 'Failed to send reset email') }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Banner msg={err} />
      <Banner msg={resetMsg} ok />

      <GlowInput
        label="Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />

      <GlowInput
        label="Password"
        type={showPw ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        suffix={<EyeBtn show={showPw} toggle={() => setShowPw(v => !v)} />}
        {...register('password')}
      />

      <button
        type="button"
        onClick={forgotPassword}
        disabled={resetting}
        className="text-[11px] text-slate-600 hover:text-slate-400 transition disabled:opacity-50"
      >
        {resetting ? 'Sending…' : 'Forgot password?'}
      </button>

      <GlowBtn loading={isSubmitting} label="Sign In" loadingLabel="Signing in…" icon={LogIn} />

      <p className="text-center text-[12px] text-slate-600">
        New here?{' '}
        <button type="button" onClick={onSwitch}
          className="font-bold hover:opacity-80 transition" style={{ color: C_CYAN }}>
          Create free account →
        </button>
      </p>
    </form>
  )
}

const ENTITY_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'company',         label: 'Private / Public Company' },
  { value: 'partnership',     label: 'Partnership Firm' },
  { value: 'trust',           label: 'Trust / NGO' },
  { value: 'individual',      label: 'Individual' },
]

// ─── Sign-Up form ─────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter()
  const [err,     setErr]     = useState<string | null>(null)
  const [showPw,  setShowPw]  = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) })

  const pw = watch('password') ?? ''

  const onSubmit = async (data: RegisterInput) => {
    setErr(null)
    const res  = await fetch('/api/v1/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setErr(json.error ?? 'Registration failed'); return }

    setSuccess(true)

    // Auto-login if register returned session tokens
    if (json.data?.access_token) {
      const supabase = createZiortBrowserClient()
      await supabase.auth.setSession({
        access_token:  json.data.access_token,
        refresh_token: json.data.refresh_token,
      })
      setTimeout(() => router.push('/dashboard'), 1800)
    } else {
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center py-10 space-y-4"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-6xl"
        >🎉</motion.div>
        <p className="text-white font-bold text-xl">Account created!</p>
        <p className="text-[13px] text-slate-400">Taking you to your workspace…</p>
        <div className="mx-auto w-24 h-1 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${C_BLUE}, ${C_CYAN})` }}
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 2, ease: 'linear' }}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <Banner msg={err} />

      <GlowInput
        label="Full Name"
        type="text"
        placeholder="Your name"
        autoComplete="name"
        autoFocus
        error={errors.display_name?.message}
        {...register('display_name')}
      />

      <GlowInput
        label="Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <div>
        <GlowInput
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="Min 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          suffix={<EyeBtn show={showPw} toggle={() => setShowPw(v => !v)} />}
          {...register('password')}
        />
        <PasswordStrength pw={pw} />
      </div>

      <GlowInput
        label="Business / Trade Name"
        type="text"
        placeholder="e.g. Sri Murugan Jewels"
        autoComplete="organization"
        error={errors.legal_name?.message}
        {...register('legal_name')}
      />

      {/* Entity type */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
          Business Type
        </label>
        <select
          {...register('entity_type')}
          className={INPUT_CLS}
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {errors.entity_type && <p className="text-[11px] text-red-400 mt-1">{errors.entity_type.message}</p>}
      </div>

      {/* Country + Language */}
      <div className="grid grid-cols-2 gap-2.5">
        {(
          [
            { label: 'Country', field: 'country_code' as const, opts: [
              ['IN', '🇮🇳 India'], ['AE', '🇦🇪 UAE'], ['US', '🇺🇸 USA'],
              ['GB', '🇬🇧 UK'],   ['SG', '🇸🇬 Singapore'],
            ]},
            { label: 'Language', field: 'preferred_lang' as const, opts: [
              ['en', 'English'], ['hi', 'हिंदी'], ['ta', 'தமிழ்'],
              ['te', 'తెలుగు'], ['ml', 'മലയാളം'], ['kn', 'ಕನ್ನಡ'],
            ]},
          ] as const
        ).map(({ label, field, opts }) => (
          <div key={field}>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              {label}
            </label>
            <select
              {...register(field)}
              className={INPUT_CLS}
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <GlowBtn loading={isSubmitting} label="Create Account — Free"
          loadingLabel="Creating account…" icon={UserPlus} />
      </div>

      <p className="text-center text-[12px] text-slate-600">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch}
          className="font-bold hover:opacity-80 transition" style={{ color: C_CYAN }}>
          Sign in →
        </button>
      </p>
    </form>
  )
}

// ─── Main AuthCard ─────────────────────────────────────────────────────────────
export default function AuthCard({ defaultTab = 'signin' }: { defaultTab?: 'signin' | 'signup' }) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)

  return (
    <div className="space-y-6">

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Orbital SVG logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="relative">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              {/* Outer orbital ring */}
              <circle cx="22" cy="22" r="20" stroke={C_CYAN} strokeWidth="0.8" opacity="0.25" />
              {/* Mid ring */}
              <circle cx="22" cy="22" r="13" stroke={C_BLUE} strokeWidth="0.8" opacity="0.4" />
              {/* Core */}
              <circle cx="22" cy="22" r="7"  fill={C_BLUE} opacity="0.95" />
              {/* Nucleus */}
              <circle cx="22" cy="22" r="3"  fill={C_CYAN} />
              {/* Top planet */}
              <circle cx="22" cy="2.8" r="2.8" fill={C_GOLD} />
              {/* Right planet */}
              <circle cx="41.2" cy="22" r="2"  fill={C_CYAN} opacity="0.6" />
            </svg>
            {/* Glow behind logo */}
            <div
              className="absolute inset-0 rounded-full blur-xl -z-10"
              style={{ background: `radial-gradient(circle, ${C_CYAN}30 0%, transparent 70%)` }}
            />
          </div>
          <div className="text-left">
            <div className="text-[30px] font-display font-bold leading-none tracking-tight"
                 style={{ color: C_CYAN }}>
              Zi
            </div>
            <div className="text-[9px] text-slate-600 tracking-[0.2em] uppercase">
              Business OS
            </div>
          </div>
        </div>
        <p className="text-[12px] text-slate-500 mt-1">
          {tab === 'signin' ? 'Sign in to your workspace' : 'Free 6-month trial — no card needed'}
        </p>
      </motion.div>

      {/* ── Aura glass card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Outer glow ring */}
        <div
          className="relative rounded-3xl p-px"
          style={{
            background: `linear-gradient(135deg, ${C_CYAN}30, ${C_BLUE}20, ${C_CYAN}15)`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04),
                        0 8px 40px ${C_BLUE}30,
                        0 0 80px ${C_CYAN}10`,
          }}
        >
          {/* Glass panel */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR }}
          >

            {/* Pulsing top neon line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${C_CYAN} 50%, transparent 100%)`,
                animation: 'pulse-glow 3s ease-in-out infinite',
              }}
            />

            {/* Inner top radial bloom */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${C_CYAN}12 0%, transparent 70%)`,
              }}
            />

            <div className="relative p-7">
              {/* Tab strip */}
              <div
                className="flex p-1 rounded-2xl mb-6 gap-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {(['signin', 'signup'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="relative flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300"
                    style={{
                      color: tab === t ? '#fff' : 'rgba(100,110,140,1)',
                    }}
                  >
                    {tab === t && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${C_BLUE}cc, ${C_CYAN}44)`,
                          boxShadow: `0 2px 12px ${C_BLUE}40`,
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">
                      {t === 'signin' ? 'Sign In' : 'Sign Up — Free'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Animated form swap */}
              <AnimatePresence mode="wait">
                {tab === 'signin' ? (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1,  x: 0,   filter: 'blur(0px)' }}
                    exit={{   opacity: 0,  x: 12,  filter: 'blur(4px)' }}
                    transition={{ duration: 0.22 }}
                  >
                    <SignInForm onSwitch={() => setTab('signup')} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 12,  filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0,   filter: 'blur(0px)' }}
                    exit={{   opacity: 0, x: -12, filter: 'blur(4px)' }}
                    transition={{ duration: 0.22 }}
                  >
                    <SignUpForm onSwitch={() => setTab('signin')} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <p className="text-center text-[10px] text-slate-700 mt-5">
                Free forever plan · No credit card required · Ziort Terms &amp; Privacy
              </p>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  )
}
