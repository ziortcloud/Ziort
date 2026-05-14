import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './core/auth/AuthProvider'
import { useSession } from './core/store/session'
import ErrorBoundary from './components/ErrorBoundary'

// ─── Lazy routes (everything is code-split for speed) ────────────────────────

// Public marketing
const LandingPage       = lazy(() => import('./pages/landing/LandingPage'))
const ProductPage       = lazy(() => import('./pages/landing/ProductPage'))
const ZiPawnProductPage = lazy(() => import('./pages/landing/ZiPawnProductPage'))

// Static / legal pages (all exported from one file — single chunk)
const AboutPage   = lazy(() => import('./pages/landing/StaticPages').then(m => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('./pages/landing/StaticPages').then(m => ({ default: m.ContactPage })))
const PrivacyPage = lazy(() => import('./pages/landing/StaticPages').then(m => ({ default: m.PrivacyPage })))
const TermsPage   = lazy(() => import('./pages/landing/StaticPages').then(m => ({ default: m.TermsPage })))

// Auth
const LoginPage        = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage     = lazy(() => import('./pages/auth/RegisterPage'))
const VerifyPage       = lazy(() => import('./pages/auth/VerifyPage'))
const SetupProfilePage = lazy(() => import('./pages/auth/SetupProfilePage'))

// App shell
const ProductHubPage  = lazy(() => import('./pages/hub/ProductHubPage'))
const ZiPawnLayout    = lazy(() => import('./pages/zipawn/layout/ZiPawnLayout'))
const ZiFleetLayout   = lazy(() => import('./pages/zifleet/layout/ZiFleetLayout'))
const ZiLoadLayout    = lazy(() => import('./pages/ziload/layout/ZiLoadLayout'))
const ZiDriverLayout  = lazy(() => import('./pages/zidriver/layout/ZiDriverLayout'))

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
})

// ─── Shared loading fallback ──────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="fixed inset-0 bg-orbit-midnight flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-pulse-glow">
          <circle cx="24" cy="24" r="22" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
          <circle cx="24" cy="24" r="13" fill="#6d6ade" opacity="0.9" />
          <circle cx="24" cy="24" r="6"  fill="#38bdf8" />
          <circle cx="24" cy="2"  r="4"  fill="#f59e0b" />
        </svg>
        <div className="w-32 h-0.5 bg-orbit-navy rounded-full overflow-hidden">
          <div className="h-full bg-zi-cyan rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
               style={{ width: '40%', animation: 'shimmer-x 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Auth guard components (mirrors ZiBiZ's RequireAuth / RequireOnboarding) ──

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <PageLoader />
  if (!user)  return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth()
  const session         = useSession()
  if (!ready)               return <PageLoader />
  if (!user)                return <Navigate to="/login" replace />
  if (!session?.individual) return <Navigate to="/setup" replace />
  return <>{children}</>
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1c1e2e', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// ─── Route table ──────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user, ready } = useAuth()
  if (!ready) return <PageLoader />

  const authed = !!user

  return (
    <Routes>
      {/* ── Public marketing ── */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/product/zipawn" element={<ZiPawnProductPage />} />
      <Route path="/product/:slug"  element={<ProductPage />} />

      {/* ── Static / legal pages ── */}
      <Route path="/about"   element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms"   element={<TermsPage />} />

      {/* ── Email verification (always accessible) ── */}
      <Route path="/verify" element={<VerifyPage />} />

      {/* ── Auth pages — redirect away if already logged in ── */}
      <Route path="/login"
        element={authed ? <Navigate to="/hub" replace /> : <LoginPage />} />
      <Route path="/register"
        element={authed ? <Navigate to="/hub" replace /> : <RegisterPage />} />

      {/* ── Setup — needs auth, profile not yet created ── */}
      <Route path="/setup"
        element={<RequireAuth><SetupProfilePage /></RequireAuth>} />

      {/* ── App hub — needs auth + profile ── */}
      <Route path="/hub"
        element={<RequireProfile><ProductHubPage /></RequireProfile>} />

      {/* ── ZiPawn standalone workspace ── */}
      <Route path="/zipawn/*"
        element={<RequireProfile><ZiPawnLayout /></RequireProfile>} />

      {/* ── ZiFleet workspace ── */}
      <Route path="/zifleet/*"
        element={<RequireProfile><ZiFleetLayout /></RequireProfile>} />

      {/* ── ZiLoad workspace ── */}
      <Route path="/ziload/*"
        element={<RequireProfile><ZiLoadLayout /></RequireProfile>} />

      {/* ── ZiDriver / ZiPilot workspace ── */}
      <Route path="/zidriver/*"
        element={<RequireProfile><ZiDriverLayout /></RequireProfile>} />

      {/* ── Legacy redirects ── */}
      <Route path="/products" element={<Navigate to="/hub" replace />} />

      {/* ── Fallback → home ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
