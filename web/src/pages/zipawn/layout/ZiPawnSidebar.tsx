import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, Wallet, Bell, BarChart2,
  Layers, Settings, Palette, BookOpen, MessageSquare, Plug,
  ChevronLeft, ChevronRight, LogOut, Globe, Scale, Building2,
} from 'lucide-react'
import { supabase } from '../../../core/supabase'
import { useSession, useSessionStore } from '../../../core/store/session'

const SECTIONS = [
  {
    label: 'DAILY',
    items: [
      { label: 'Dashboard',  icon: LayoutDashboard, to: '/zipawn/dashboard'  },
      { label: 'Customers',  icon: Users,           to: '/zipawn/customers'  },
      { label: 'Loans',      icon: CreditCard,      to: '/zipawn/loans'      },
      { label: 'Payments',   icon: Wallet,          to: '/zipawn/payments'   },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { label: 'Reports',      icon: BarChart2, to: '/zipawn/reports'       },
      { label: 'Overdue',      icon: Bell,      to: '/zipawn/reminders'     },
      { label: 'Metal Prices', icon: Scale,     to: '/zipawn/metal-prices'  },
      { label: 'Migration',    icon: Layers,    to: '/zipawn/migration'     },
    ],
  },
  {
    label: 'MY BUSINESS',
    items: [
      { label: 'Branches',  icon: Building2, to: '/zipawn/branches' },
      { label: 'Branding',  icon: Palette,   to: '/zipawn/branding' },
    ],
  },
  {
    label: 'LOANS CONFIG',
    items: [
      { label: 'Schemes',    icon: BookOpen,  to: '/zipawn/schemes'    },
      { label: 'Templates',  icon: CreditCard,to: '/zipawn/templates'  },
    ],
  },
  {
    label: 'COMMS',
    items: [
      { label: 'Communication', icon: MessageSquare, to: '/zipawn/comms'        },
      { label: 'Integrations',  icon: Plug,          to: '/zipawn/integrations' },
    ],
  },
]

const LANGS = [
  { code: 'en', label: 'EN' }, { code: 'hi', label: 'HI' }, { code: 'ta', label: 'TA' },
  { code: 'te', label: 'TE' }, { code: 'kn', label: 'KN' }, { code: 'ml', label: 'ML' },
  { code: 'bn', label: 'BN' }, { code: 'mr', label: 'MR' }, { code: 'gu', label: 'GU' },
]

interface Props { open: boolean; onToggle: () => void }

export default function ZiPawnSidebar({ open, onToggle }: Props) {
  const navigate          = useNavigate()
  const session           = useSession()
  const { clearSession }  = useSessionStore()
  const [lang, setLang]   = useState('en')
  const [showLang, setShowLang] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={`fixed left-0 top-0 h-full bg-orbit-deep border-r border-white/5
                       flex flex-col transition-all duration-200 z-40 select-none
                       ${open ? 'w-56' : 'w-14'}`}>

      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-white/5 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="shrink-0">
            <circle cx="13" cy="13" r="11" stroke="#38bdf8" strokeWidth="1.2" opacity="0.35"/>
            <circle cx="13" cy="13" r="7" fill="#6d6ade" opacity="0.9"/>
            <circle cx="13" cy="13" r="3" fill="#38bdf8"/>
            <circle cx="13" cy="2"  r="2" fill="#f59e0b"/>
          </svg>
          {open && (
            <span className="font-bold text-sm text-zi-white whitespace-nowrap overflow-hidden">
              <span className="text-zi-cyan">Zi</span>Pawn
            </span>
          )}
        </div>
        <button onClick={onToggle}
          className="text-zi-muted hover:text-zi-white transition-colors shrink-0 p-0.5"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}>
          {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-none [scrollbar-width:none]">
        {SECTIONS.map(section => (
          <div key={section.label}>
            {open && (
              <p className="px-4 mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-zi-muted/60">
                {section.label}
              </p>
            )}
            {!open && <div className="h-px mx-3 bg-white/5 mb-1" />}
            <div className="space-y-0.5 px-2">
              {section.items.map(item => (
                <SidebarItem key={item.to} {...item} open={open} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-2 py-2 space-y-0.5">
        <SidebarItem to="/zipawn/settings" icon={Settings} label="Settings" open={open} />

        {open && session?.individual && (
          <div className="px-3 py-2 flex items-center gap-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-zi-blue/20 flex items-center justify-center text-xs font-bold text-zi-blue shrink-0">
              {session.individual.display_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zi-white truncate">{session.individual.display_name}</p>
              <p className="text-[10px] text-zi-muted truncate">{session.email}</p>
            </div>
          </div>
        )}

        <div className={`flex ${open ? 'justify-between px-3' : 'justify-center'} items-center pt-1`}>
          <div className="relative">
            <button onClick={() => setShowLang(v => !v)}
              className="flex items-center gap-1 text-[11px] text-zi-muted hover:text-zi-white transition-colors p-1">
              <Globe size={12} />
              {open && <span className="uppercase">{lang}</span>}
            </button>
            {showLang && (
              <div className="absolute bottom-full left-0 mb-1 bg-orbit-navy border border-white/10 rounded-lg p-1.5
                              grid grid-cols-3 gap-1 shadow-xl z-50 min-w-[110px]">
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false) }}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors
                      ${lang === l.code ? 'bg-zi-blue text-white' : 'text-zi-muted hover:bg-orbit-deep hover:text-zi-white'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={signOut}
            className="p-1.5 text-zi-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            title="Sign out">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ to, icon: Icon, label, open }: { to: string; icon: React.ElementType; label: string; open: boolean }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-all duration-150
         ${isActive
           ? 'bg-orbit-navy text-zi-white border-l-2 border-zi-cyan'
           : 'text-zi-muted hover:bg-orbit-navy/50 hover:text-zi-white border-l-2 border-transparent'
         }`
      }
      title={!open ? label : undefined}>
      <Icon size={14} className="shrink-0" />
      {open && <span className="truncate font-medium">{label}</span>}
    </NavLink>
  )
}
