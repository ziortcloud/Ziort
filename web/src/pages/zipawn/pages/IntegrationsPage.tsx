// Integrations — payment gateway, KYC, accounting connectors
import { useState } from 'react'
import { Check, ExternalLink, ChevronRight } from 'lucide-react'

interface Props { entityId: string; subscriptionId: string }

const INTEGRATIONS = [
  {
    category: 'Payment Gateways',
    items: [
      { id: 'razorpay', name: 'Razorpay', logo: '🔵', desc: 'Accept UPI, cards and netbanking via Razorpay', status: 'available' },
      { id: 'cashfree', name: 'Cashfree', logo: '🟢', desc: 'Payment collection via Cashfree payment links', status: 'available' },
      { id: 'paytm',    name: 'Paytm',    logo: '🔵', desc: 'QR-based payments via Paytm for Business',      status: 'coming_soon' },
    ],
  },
  {
    category: 'KYC & Verification',
    items: [
      { id: 'digilocker', name: 'DigiLocker', logo: '🏛️', desc: 'Verify Aadhaar and PAN via DigiLocker',    status: 'available' },
      { id: 'karza',      name: 'Karza',      logo: '🔍', desc: 'Real-time KYC with OCR + facial match',     status: 'coming_soon' },
    ],
  },
  {
    category: 'Accounting',
    items: [
      { id: 'tally', name: 'Tally',     logo: '📊', desc: 'Sync loan transactions to Tally ERP',    status: 'coming_soon' },
      { id: 'busy',  name: 'BUSY',      logo: '📈', desc: 'Two-way sync with BUSY accounting',       status: 'coming_soon' },
    ],
  },
  {
    category: 'Credit Bureau',
    items: [
      { id: 'cibil',    name: 'CIBIL / TransUnion', logo: '📋', desc: 'Pull CIBIL score for loan applicants', status: 'coming_soon' },
      { id: 'equifax',  name: 'Equifax',             logo: '📋', desc: 'Pull Equifax credit report',           status: 'coming_soon' },
    ],
  },
]

export default function IntegrationsPage({ entityId: _e, subscriptionId: _s }: Props) {
  const [configured] = useState<Set<string>>(new Set())

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zi-white">Integrations</h1>
        <p className="text-xs text-zi-muted">Connect ZiPawn with payment gateways, KYC providers and accounting software</p>
      </div>

      {INTEGRATIONS.map(group => (
        <div key={group.category}>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zi-muted/60 mb-2">{group.category}</p>
          <div className="space-y-2">
            {group.items.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-orbit-deep border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-2xl shrink-0">{item.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zi-white">{item.name}</p>
                    {configured.has(item.id) && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                        <Check size={9} /> Connected
                      </span>
                    )}
                    {item.status === 'coming_soon' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zi-muted/10 text-zi-muted border border-zi-muted/15">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zi-muted mt-0.5">{item.desc}</p>
                </div>
                {item.status === 'available' && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orbit-navy border border-white/8 hover:border-zi-cyan/20 hover:text-zi-cyan rounded-lg text-xs text-zi-muted transition-colors shrink-0">
                    {configured.has(item.id) ? (
                      <><ExternalLink size={11} /> Manage</>
                    ) : (
                      <><ChevronRight size={11} /> Connect</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
