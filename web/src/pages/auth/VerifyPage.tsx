import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../core/supabase'
import SpaceBackground from '../../components/SpaceBackground'
import Logo from '../../components/Logo'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyPage() {
  const navigate      = useNavigate()
  const [status, setStatus] = useState<Status>('verifying')
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    // Supabase redirects here with #access_token + #refresh_token in the hash
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('success')
        setTimeout(() => navigate('/setup', { replace: true }), 1800)
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      }
    })

    // Also check for error in URL params
    const hash   = new URLSearchParams(window.location.hash.slice(1))
    const errMsg = hash.get('error_description')
    if (errMsg) { setStatus('error'); setMsg(errMsg) }
  }, [])

  return (
    <div className="relative min-h-screen bg-orbit-midnight flex items-center justify-center p-4">
      <SpaceBackground />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm text-center">

        <div className="flex justify-center mb-8">
          <Logo size="md" linked={false} />
        </div>

        <div className="bg-orbit-deep border border-white/8 rounded-2xl p-10 shadow-2xl">
          {status === 'verifying' && (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-zi-blue/10 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zi-blue/30 border-t-zi-blue rounded-full animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-zi-white">Verifying your email…</h2>
              <p className="text-sm text-zi-muted mt-2">Please wait a moment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle size={52} className="text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-zi-white">Email verified!</h2>
              <p className="text-sm text-zi-muted mt-2">Redirecting you to setup…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle size={52} className="text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-zi-white">Verification failed</h2>
              <p className="text-sm text-zi-muted mt-2">{msg || 'Invalid or expired link.'}</p>
              <a href="/register" className="mt-5 inline-block text-sm text-zi-cyan hover:text-zi-cyan/80 transition-colors">
                Try again
              </a>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
