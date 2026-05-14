import { lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useActiveSubscriptions } from '../../../core/store/session'
import ZiDriverSidebar from './ZiDriverSidebar'

const ProfilePage        = lazy(() => import('../pages/ProfilePage'))
const AvailabilityPage   = lazy(() => import('../pages/AvailabilityPage'))
const DocumentsPage      = lazy(() => import('../pages/DocumentsPage'))
const DiscoverPage       = lazy(() => import('../pages/DiscoverPage'))
const EngagementsPage    = lazy(() => import('../pages/EngagementsPage'))
const EngagementDetailPage = lazy(() => import('../pages/EngagementDetailPage'))

const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
  </div>
)

export default function ZiDriverLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const subscriptions = useActiveSubscriptions()
  const sub = subscriptions.find(s => s.product_code === 'ZDR')
  if (!sub) return <Navigate to="/hub" replace />

  const entityId       = sub.entity_id
  const subscriptionId = sub.id
  const ctx            = { entityId, subscriptionId }

  return (
    <div className="flex h-screen bg-orbit-midnight overflow-hidden">
      <ZiDriverSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        <header className="h-14 shrink-0 bg-orbit-deep border-b border-white/5 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-zi-white">Driver Marketplace</p>
          <span className="text-xs text-zi-muted font-mono">{sub.entity_id.slice(0, 8)}</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-orbit-midnight">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile"                    element={<ProfilePage          {...ctx} />} />
              <Route path="availability"               element={<AvailabilityPage     {...ctx} />} />
              <Route path="documents"                  element={<DocumentsPage        {...ctx} />} />
              <Route path="discover"                   element={<DiscoverPage         {...ctx} />} />
              <Route path="engagements"                element={<EngagementsPage      {...ctx} />} />
              <Route path="engagements/:engId"         element={<EngagementDetailPage {...ctx} />} />
              <Route path="*" element={<Navigate to="profile" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
