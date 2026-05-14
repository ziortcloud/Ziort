'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Gem, Users, Percent, FileText, Settings } from 'lucide-react'

const SUBNAV = [
  { href: '/zipawn/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/zipawn/loans',     label: 'Loans',     icon: Gem },
  { href: '/zipawn/customers', label: 'Customers', icon: Users },
  { href: '/zipawn/schemes',   label: 'Schemes',   icon: Percent },
  { href: '/zipawn/tickets',   label: 'Tickets',   icon: FileText },
  { href: '/zipawn/settings',  label: 'Settings',  icon: Settings },
]

export default function ZiPawnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-0">
      {/* Product sub-nav */}
      <div className="flex items-center gap-1 mb-5 border-b border-white/5 pb-0 -mt-1 overflow-x-auto scrollbar-none">
        {SUBNAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2
                          transition-all whitespace-nowrap -mb-px
                          ${active
                            ? 'border-zi-cyan text-zi-cyan'
                            : 'border-transparent text-zi-muted hover:text-zi-white'
                          }`}>
              <item.icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </div>
      {children}
    </div>
  )
}
