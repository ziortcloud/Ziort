import { lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useActiveSubscriptions } from '../../../core/store/session'
import ZiLoadSidebar from './ZiLoadSidebar'

const DashboardPage      = lazy(() => import('../pages/DashboardPage'))
const LoadBoardPage      = lazy(() => import('../pages/LoadBoardPage'))
const MyLoadsPage        = lazy(() => import('../pages/MyLoadsPage'))
const TrucksPage         = lazy(() => import('../pages/TrucksPage'))
const MyTrucksPage       = lazy(() => import('../pages/MyTrucksPage'))
const BookingsPage       = lazy(() => import('../pages/BookingsPage'))
const BookingDetailPage  = lazy(() => import('../pages/BookingDetailPage'))
const RateCardsPage      = lazy(() => import('../pages/RateCardsPage'))
const ProfilePage        = lazy(() => import('../pages/ProfilePage'))

const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
  </div>
)

export default function ZiLoadLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const subscriptions = useActiveSubscriptions()
  const sub = subscriptions.find(s => s.product_code === 'ZLD')
  if (!sub) return <Navigate to="/hub" replace />

  const entityId       = sub.entity_id
  const subscriptionId = sub.id
  const ctx            = { entityId, subscriptionId }

  return (
    <div className="flex h-screen bg-orbit-midnight overflow-hidden">
      <ZiLoadSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        <header className="h-14 shrink-0 bg-orbit-deep border-b border-white/5 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-zi-white">Freight Marketplace</p>
          <span className="text-xs text-zi-muted font-mono">{sub.entity_id.slice(0, 8)}</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-orbit-midnight">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"           element={<DashboardPage     {...ctx} />} />
              <Route path="loads"               element={<LoadBoardPage     {...ctx} />} />
              <Route path="my-loads"            element={<MyLoadsPage       {...ctx} />} />
              <Route path="trucks"              element={<TrucksPage        {...ctx} />} />
              <Route path="my-trucks"           element={<MyTrucksPage      {...ctx} />} />
              <Route path="bookings"            element={<BookingsPage      {...ctx} />} />
              <Route path="bookings/:bookingId" element={<BookingDetailPage {...ctx} />} />
              <Route path="rate-cards"          element={<RateCardsPage     {...ctx} />} />
              <Route path="profile"             element={<ProfilePage       {...ctx} />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
