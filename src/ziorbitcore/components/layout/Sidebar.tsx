'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Settings, Users, CreditCard,
  ChevronLeft, ChevronRight, ChevronDown,
  // product icons
  Gem, Truck, Package2, Heart, Utensils, ShoppingBag,
  Building2, Wheat, Megaphone, ScanLine, Calculator,
  Receipt, FileText, Quote, BookOpen, Share2,
  Zap, ShoppingCart, Database,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useSessionStore } from '@/ziorbitcore/store/session'

const CORE_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard'  },
  { label: 'Members',   icon: Users,           href: '/members'    },
  { label: 'Billing',   icon: CreditCard,      href: '/billing'    },
  { label: 'Migrations',icon: Database,        href: '/migrations' },
]

const PRODUCTS = [
  { code: 'ZPN',   name: 'ZiPawn',    icon: Gem,          href: '/zipawn'    },
  { code: 'ZPLS',  name: 'ZiPulse',   icon: Zap,          href: '/zipulse'   },
  { code: 'ZND',   name: 'ZiNeed',    icon: ShoppingCart, href: '/zineed'    },
  { code: 'ZFLT',  name: 'ZiFleet',   icon: Truck,        href: '/zifleet'   },
  { code: 'ZLD',   name: 'ZiLoad',    icon: Package2,     href: '/ziload'    },
  { code: 'ZFD',   name: 'ZiFood',    icon: Utensils,     href: '/zifood'    },
  { code: 'ZCR',   name: 'ZiCare',    icon: Heart,        href: '/zicare'    },
  { code: 'ZSHP',  name: 'ZiShop',    icon: ShoppingBag,  href: '/zishop'    },
  { code: 'ZCHT',  name: 'ZiChit',    icon: Gem,          href: '/zichit'    },
  { code: 'ZBLD',  name: 'ZiBuild',   icon: Building2,    href: '/zibuild'   },
  { code: 'ZYLD',  name: 'ZiYield',   icon: Wheat,        href: '/ziyield'   },
  { code: 'ZPST',  name: 'ZiPost',    icon: Megaphone,    href: '/zipost'    },
  { code: 'ZSCN',  name: 'ZiScan',    icon: ScanLine,     href: '/ziscan'    },
  { code: 'ZCLC',  name: 'ZiCalc',    icon: Calculator,   href: '/zicalc'    },
  { code: 'ZRCP',  name: 'ZiReceipt', icon: Receipt,      href: '/zireceipt' },
  { code: 'ZNVC',  name: 'ZiInvoice', icon: FileText,     href: '/ziinvoice' },
  { code: 'ZQT',   name: 'ZiQuote',   icon: Quote,        href: '/ziquote'   },
  { code: 'ZLDG',  name: 'ZiLedger',  icon: BookOpen,     href: '/ziledger'  },
  { code: 'ZPRTN', name: 'ZiPartner', icon: Share2,       href: '/zipartner' },
]

interface SidebarProps { open: boolean; onToggle: () => void }

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname      = usePathname()
  const [prOpen, setPrOpen] = useState(true)
  const session       = useSessionStore(s => s.session)

  const subscribedProducts = useMemo(() => {
    const codes = new Set(session?.activeSubscriptions?.map(s => s.product_code) ?? [])
    return PRODUCTS.filter(p => codes.has(p.code as any))
  }, [session?.activeSubscriptions])

  return (
    <aside className={`fixed left-0 top-0 h-full bg-orbit-deep border-r border-white/5
                       flex flex-col transition-all duration-300 z-40
                       ${open ? 'w-60' : 'w-14'}`}>

      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/5 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="shrink-0">
            <circle cx="13" cy="13" r="11" stroke="#38bdf8" strokeWidth="1.2" opacity="0.35"/>
            <circle cx="13" cy="13" r="7" fill="#6d6ade" opacity="0.9"/>
            <circle cx="13" cy="13" r="3" fill="#38bdf8"/>
            <circle cx="13" cy="2" r="2" fill="#f59e0b"/>
          </svg>
          {open && (
            <span className="font-display font-bold text-sm text-zi-white whitespace-nowrap overflow-hidden">
              <span className="text-zi-cyan">Zi</span>Orbit
            </span>
          )}
        </div>
        <button onClick={onToggle}
          className="text-zi-muted hover:text-zi-white transition-colors shrink-0"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}>
          {open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5
                      scrollbar-thin scrollbar-thumb-zi-muted/20">
        {CORE_NAV.map(item => (
          <NavItem key={item.href} {...item} open={open}
            active={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))} />
        ))}

        {/* Products section */}
        <div className="pt-2">
          {open ? (
            <button onClick={() => setPrOpen(v => !v)}
              className="flex items-center justify-between w-full px-3 py-1.5 mb-0.5">
              <span className="text-zi-muted text-[10px] font-medium uppercase tracking-widest">
                Products
              </span>
              <ChevronDown size={11}
                className={`text-zi-muted transition-transform duration-200 ${prOpen ? '' : '-rotate-90'}`} />
            </button>
          ) : (
            <div className="h-px bg-white/5 mx-2 my-2" />
          )}

          {(prOpen || !open) && subscribedProducts.length > 0 && subscribedProducts.map(p => (
            <NavItem key={p.code} href={p.href} icon={p.icon} label={p.name}
              open={open} active={pathname.startsWith(p.href)} />
          ))}
          {(prOpen || !open) && subscribedProducts.length === 0 && open && (
            <p className="px-3 py-2 text-[11px] text-zi-muted/60 italic">
              No products subscribed
            </p>
          )}
        </div>
      </nav>

      {/* Settings */}
      <div className="px-2 py-2 border-t border-white/5">
        <NavItem href="/settings" icon={Settings} label="Settings" open={open}
          active={pathname.startsWith('/settings')} />
      </div>
    </aside>
  )
}

function NavItem({ href, icon: Icon, label, open, active }: {
  href: string; icon: React.ElementType; label: string; open: boolean; active: boolean
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
                  ${active
                    ? 'bg-orbit-navy text-zi-white border-l-2 border-zi-cyan'
                    : 'text-zi-muted hover:bg-orbit-navy/50 hover:text-zi-white border-l-2 border-transparent'
                  }`}
      title={!open ? label : undefined}>
      <Icon size={15} className="shrink-0" />
      {open && <span className="truncate font-body text-[13px]">{label}</span>}
    </Link>
  )
}
