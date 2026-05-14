import { lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useActiveSubscriptions } from '../../../core/store/session'
import ZiPawnSidebar from './ZiPawnSidebar'
import ZiPawnTopbar  from './ZiPawnTopbar'

// ─── Lazy-load every ZiPawn page ──────────────────────────────────────────────
const DashboardPage      = lazy(() => import('../pages/DashboardPage'))
const LoansPage          = lazy(() => import('../pages/LoansPage'))
const LoanDetailPage     = lazy(() => import('../pages/LoanDetailPage'))
const NewTicketPage      = lazy(() => import('../pages/NewTicketPage'))
const CustomersPage      = lazy(() => import('../pages/CustomersPage'))
const CustomerDetailPage = lazy(() => import('../pages/CustomerDetailPage'))
const SchemesPage        = lazy(() => import('../pages/SchemesPage'))
const SettingsPage       = lazy(() => import('../pages/SettingsPage'))

// New pages
const PaymentsPage       = lazy(() => import('../pages/PaymentsPage'))
const AlertsPage         = lazy(() => import('../pages/AlertsPage'))
const ReportsPage        = lazy(() => import('../pages/ReportsPage'))
const GoldRatePage       = lazy(() => import('../pages/GoldRatePage'))
const BranchesPage       = lazy(() => import('../pages/BranchesPage'))
const BrandingPage       = lazy(() => import('../pages/BrandingPage'))
const CommunicationPage  = lazy(() => import('../pages/CommunicationPage'))
const MigrationPage      = lazy(() => import('../pages/MigrationPage'))

// Settings sub-pages that live at their own routes
const IntegrationsPage   = lazy(() => import('../pages/IntegrationsPage'))

const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 border-2 border-zi-blue/30 border-t-zi-blue rounded-full animate-spin" />
  </div>
)

export default function ZiPawnLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const subscriptions = useActiveSubscriptions()
  const sub = subscriptions.find(s => s.product_code === 'ZPN')

  if (!sub) return <Navigate to="/hub" replace />

  const entityId       = sub.entity_id
  const subscriptionId = sub.id

  const ctx = { entityId, subscriptionId }

  return (
    <div className="flex h-screen bg-orbit-midnight overflow-hidden">
      <ZiPawnSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        <ZiPawnTopbar entityId={entityId} subscriptionId={subscriptionId} />

        <main className="flex-1 overflow-y-auto bg-orbit-midnight">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Root redirect */}
              <Route index element={<Navigate to="dashboard" replace />} />

              {/* ── Daily ops ── */}
              <Route path="dashboard" element={<DashboardPage {...ctx} />} />
              <Route path="loans"     element={<LoansPage     {...ctx} />} />
              <Route path="loans/:loanId" element={<LoanDetailPage {...ctx} />} />
              <Route path="tickets/new"   element={<NewTicketPage  {...ctx} />} />
              <Route path="payments"      element={<PaymentsPage   {...ctx} />} />

              {/* ── Customers ── */}
              <Route path="customers"              element={<CustomersPage     {...ctx} />} />
              <Route path="customers/new"          element={<CustomerDetailPage {...ctx} mode="create" />} />
              <Route path="customers/:customerId"  element={<CustomerDetailPage {...ctx} mode="view"   />} />

              {/* ── Tools ── */}
              <Route path="reports"       element={<ReportsPage   {...ctx} />} />
              <Route path="reminders"     element={<AlertsPage    {...ctx} />} />
              <Route path="metal-prices"  element={<GoldRatePage  {...ctx} />} />
              <Route path="migration"     element={<MigrationPage {...ctx} />} />

              {/* ── My Business ── */}
              <Route path="branches" element={<BranchesPage {...ctx} />} />
              <Route path="branding"  element={<BrandingPage  {...ctx} />} />

              {/* ── Loans Config ── */}
              <Route path="schemes"   element={<SchemesPage   {...ctx} />} />
              <Route path="templates" element={<BrandingPage  {...ctx} />} />

              {/* ── Comms ── */}
              <Route path="comms"        element={<CommunicationPage {...ctx} />} />
              <Route path="integrations" element={<IntegrationsPage  {...ctx} />} />

              {/* ── Billing (settings sub-route) ── */}
              <Route path="billing"   element={<BillingPage {...ctx} />} />

              {/* ── Settings hub ── */}
              <Route path="settings"  element={<SettingsPage {...ctx} />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// Inline stub pages for routes not yet fully built (Integrations, Billing)
// These will be replaced with full implementations as needed
function BillingPage({ entityId: _e, subscriptionId: _s }: { entityId: string; subscriptionId: string }) {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-zi-white mb-2">Billing & Plan</h1>
      <p className="text-xs text-zi-muted mb-6">Manage your Ziort subscription and payment history</p>
      <div className="p-5 rounded-xl bg-orbit-deep border border-zi-blue/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zi-blue/15 flex items-center justify-center">
            <span className="text-zi-blue text-lg">💎</span>
          </div>
          <div>
            <p className="text-sm font-bold text-zi-white">ZiPawn Pro</p>
            <p className="text-xs text-green-400">Active · 90-day trial</p>
          </div>
        </div>
        <p className="text-xs text-zi-muted">Full billing management and invoice history coming soon. Contact support for plan changes.</p>
      </div>
    </div>
  )
}
