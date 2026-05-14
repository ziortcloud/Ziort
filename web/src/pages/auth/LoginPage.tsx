import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { supabase } from '../../core/supabase'
import SpaceBackground from '../../components/SpaceBackground'
import Logo from '../../components/Logo'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const redirect      = params.get('redirect') || '/products'
  const [showPw, setShowPw] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  async function onSubmit({ email, password }: Form) {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-orbit-midnight flex items-center justify-center p-4">
      <SpaceBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" linked={false} />
        </div>

        <div className="bg-orbit-deep border border-white/8 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-zi-white mb-1">Welcome back</h1>
          <p className="text-sm text-zi-muted mb-6">Sign in to your Ziort account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zi-muted mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                           placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20
                           transition-colors"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zi-muted">Password</label>
                <Link to="/forgot-password" className="text-xs text-zi-cyan hover:text-zi-cyan/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-orbit-navy border border-white/8 rounded-lg text-sm text-zi-white
                             placeholder:text-zi-muted/50 focus:outline-none focus:border-zi-cyan/50 focus:ring-1 focus:ring-zi-cyan/20
                             transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zi-muted hover:text-zi-white transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zi-blue hover:bg-zi-blue/90
                         disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white
                         transition-colors mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={14} /> Sign in</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zi-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-zi-cyan hover:text-zi-cyan/80 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
