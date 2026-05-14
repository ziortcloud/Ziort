import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { supabase } from '../../core/supabase'
import SpaceBackground from '../../components/SpaceBackground'
import Logo from '../../components/Logo'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate      = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [sent,   setSent]   = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  async function onSubmit({ email, password }: Form) {
    setError(null)
    const redirectBase = import.meta.env.VITE_APP_URL || window.location.origin
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${redirectBase}/verify` },
    })
    if (error) { setError(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="relative min-h-screen bg-orbit-midnight flex items-center justify-center p-4">
        <SpaceBackground />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md bg-orbit-deep border border-white/8 rounded-2xl p-10 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-zi-cyan/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-zi-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zi-white mb-2">Check your email</h2>
          <p className="text-sm text-zi-muted">We sent a verification link to your email. Click it to activate your account.</p>
          <Link to="/login" className="mt-6 inline-block text-sm text-zi-cyan hover:text-zi-cyan/80 transition-colors">
            Back to login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-orbit-midnight flex items-center justify-center p-4">
      <SpaceBackground />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md">

        <div className="flex justify-center mb-8">
          <Logo size="lg" linked={false} />
        </div>

        <div className="bg-orbit-deep border border-white/8 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-zi-white mb-1">Create your account</h1>
          <p className="text-sm text-zi-muted mb-6">Start your Ziort journey — free for 14 days</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zi-muted mb-1.5">Email</label>
              <input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                           placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors" />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-zi-muted mb-1.5">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                             placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zi-muted hover:text-zi-white transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-zi-muted mb-1.5">Confirm password</label>
              <input {...register('confirm')} type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                           placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20 transition-colors" />
              {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zi-blue hover:bg-zi-blue/90
                         disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors mt-2">
              {isSubmitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus size={14} /> Create account</>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zi-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-zi-cyan hover:text-zi-cyan/80 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
