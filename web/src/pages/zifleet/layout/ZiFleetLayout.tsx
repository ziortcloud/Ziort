import { lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useActiveSubscriptions } from '../../../core/store/session'
import ZiFleetSidebar from './ZiFleetSidebar'

const DashboardPage   = lazy(() => import('../pages/DashboardPage'))
const VehiclesPage    = lazy(() => import('../pages/VehiclesPage'))
const DriversPage     = lazy(() => import('../pages/DriversPage'))
const TripsPage       = lazy(() => import('../pages/TripsPage'))
const TripDetailPage  = lazy(() => import('../pages/TripDetailPage'))
const NewTripPage     = lazy(() => import('../pages/NewTripPage'))
const MaintenancePage = lazy(() => import('../pages/MaintenancePage'))

const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
  </div>
)

export default function ZiFleetLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const subscriptions = useActiveSubscriptions()
  const sub = subscriptions.find(s => s.product_code === 'ZFLT')
  if (!sub) return <Navigate to="/hub" replace />

  const entityId       = sub.entity_id
  const subscriptionId = sub.id
  const ctx            = { entityId, subscriptionId }

  return (
    <div className="flex h-screen bg-orbit-midnight overflow-hidden">
      <ZiFleetSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        {/* Topbar */}
        <header className="h-14 shrink-0 bg-orbit-deep border-b border-white/5 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-zi-white">Fleet Management</p>
          <span className="text-xs text-zi-muted font-mono">{sub.entity_id.slice(0, 8)}</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-orbit-midnight">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"      element={<DashboardPage   {...ctx} />} />
              <Route path="vehicles"       element={<VehiclesPage    {...ctx} />} />
              <Route path="drivers"        element={<DriversPage     {...ctx} />} />
              <Route path="trips"          element={<TripsPage       {...ctx} />} />
              <Route path="trips/new"      element={<NewTripPage     {...ctx} />} />
              <Route path="trips/:tripId"  element={<TripDetailPage  {...ctx} />} />
              <Route path="maintenance"   element={<MaintenancePage {...ctx} />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
