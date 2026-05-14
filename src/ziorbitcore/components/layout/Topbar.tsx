'use client'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { useSession } from '../../hooks/use-session'
import { useSessionStore } from '../../store/session'

interface TopbarProps { onMenuToggle: () => void }

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { session } = useSession()

  return (
    <header className="h-14 bg-orbit-deep border-b border-white/5 flex items-center
                       px-4 gap-4 shrink-0">
      <button onClick={onMenuToggle}
        className="text-zi-muted hover:text-zi-white transition-colors md:hidden"
        aria-label="Toggle menu">
        <Menu size={18} />
      </button>

      <EntitySelector />
      <div className="flex-1" />

      <button className="relative text-zi-muted hover:text-zi-white transition-colors">
        <Bell size={18} />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-zi-gold rounded-full" />
      </button>

      <div className="flex items-center gap-2 cursor-pointer">
        <div className="w-7 h-7 bg-zi-blue rounded-full flex items-center justify-center">
          <span className="text-xs font-display font-bold text-white">
            {session?.individual?.display_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        {session?.individual && (
          <span className="text-zi-white text-sm hidden sm:block">
            {session.individual.display_name}
          </span>
        )}
        <ChevronDown size={14} className="text-zi-muted" />
      </div>
    </header>
  )
}

function EntitySelector() {
  const { session } = useSession()
  const { setActiveEntity } = useSessionStore()
  const active = session?.activeEntity
  if (!active) return null

  return (
    <div className="flex items-center gap-2 bg-orbit-navy border border-white/5
                    rounded-md px-3 py-1.5 cursor-pointer hover:border-zi-blue/30
                    transition-all duration-200">
      <div className="w-5 h-5 bg-zi-blue/20 rounded flex items-center justify-center">
        <span className="text-[10px] font-display font-bold text-zi-cyan">
          {active.legal_name[0]}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-zi-white text-xs font-display font-semibold leading-none">
          {active.trade_name ?? active.legal_name}
        </span>
        <span className="ref-code leading-none mt-0.5">{active.zi_code}</span>
      </div>
      <ChevronDown size={12} className="text-zi-muted ml-1" />
    </div>
  )
}
