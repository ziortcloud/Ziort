// ZiPawn Settings Hub — full settings dashboard
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Palette, MessageSquare, Plug, Building2, CreditCard,
  Scale, FileText, ChevronRight,
} from 'lucide-react'

interface Props { entityId: string; subscriptionId: string }

const GROUPS = [
  {
    label: 'Business',
    items: [
      { icon: Palette,    label: 'Branding & Company',  desc: 'Logo, name, receipt header & footer',     to: '/zipawn/branding',       color: 'text-amber-400 bg-amber-400/10'  },
      { icon: Building2,  label: 'Branches',            desc: 'Manage your business locations',           to: '/zipawn/branches',       color: 'text-blue-400 bg-blue-400/10'    },
    ],
  },
  {
    label: 'Loans',
    items: [
      { icon: BookOpen,   label: 'Loan Schemes',         desc: 'Interest rates, LTV and tenure limits',   to: '/zipawn/schemes',        color: 'text-zi-blue bg-zi-blue/10'      },
      { icon: Scale,      label: 'Metal Prices',         desc: 'Live gold & silver rates for valuation',  to: '/zipawn/metal-prices',   color: 'text-amber-300 bg-amber-300/10'  },
      { icon: FileText,   label: 'Receipt Templates',    desc: 'Customise pawn ticket & receipt layout',  to: '/zipawn/templates',      color: 'text-violet-400 bg-violet-400/10'},
    ],
  },
  {
    label: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Communication',    desc: 'SMS, WhatsApp and email providers',        to: '/zipawn/comms',          color: 'text-green-400 bg-green-400/10'  },
      { icon: Plug,          label: 'Integrations',     desc: 'Payment gateway, KYC, accounting links',   to: '/zipawn/integrations',   color: 'text-pink-400 bg-pink-400/10'    },
    ],
  },
  {
    label: 'Billing',
    items: [
      { icon: CreditCard, label: 'Billing & Plan',      desc: 'Ziort subscription, invoices',          to: '/zipawn/billing',        color: 'text-orange-400 bg-orange-400/10'},
    ],
  },
]

export default function SettingsPage({ entityId: _eId, subscriptionId: _sId }: Props) {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Settings</h1>
        <p className="text-xs text-zi-muted">Configure your ZiPawn workspace</p>
      </div>

      {GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zi-muted/60 mb-2">{group.label}</p>
          <div className="space-y-2">
            {group.items.map(item => {
              const Icon = item.icon
              return (
                <button key={item.to} onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors text-left group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zi-white group-hover:text-zi-cyan transition-colors">{item.label}</p>
                    <p className="text-xs text-zi-muted">{item.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-zi-muted group-hover:text-zi-cyan transition-colors shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
