'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="min-h-screen flex bg-orbit-midnight">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-14'}`}>
        <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
