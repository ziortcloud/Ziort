// ZiPawn Landing Page — replica of zibiz.in/zipawn adapted for Ziort
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Bell, BarChart2,
  ArrowRight, Check, ChevronDown, ChevronUp, Smartphone, Globe, Lock,
  GitMerge, Printer, Search, Star, Zap, Building2, ClipboardList,
  CreditCard, ScanLine, Languages, Shield, Receipt, Menu, X,
} from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

// ── How It Works — animated scene illustrations ───────────────────────────────

function AppraisalScene() {
  return (
    <div className="h-32 bg-slate-900 rounded-xl border border-emerald-500/20 p-3 mb-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[10px] font-black text-white shrink-0">RK</div>
        <div className="flex-1 min-w-0">
          <div className="h-2 w-20 bg-white/20 rounded mb-1" />
          <div className="h-1.5 w-28 bg-emerald-400/25 rounded" />
        </div>
        <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5 shrink-0">✓ KYC</span>
      </div>
      <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🪙</span>
          <div>
            <div className="text-[9px] text-amber-300 font-semibold">Gold Chain · 22K · 8.2g</div>
            <div className="h-1.5 w-16 bg-amber-400/15 rounded mt-0.5" />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold text-amber-400">₹37,760</div>
          <div className="text-[8px] text-amber-400/50">Market value</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] text-slate-500 shrink-0">Eligible at 75%</span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            initial={{ width: 0 }}
            whileInView={{ width: '75%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-bold text-emerald-400 shrink-0">₹28,320</span>
      </div>
    </div>
  )
}

function DisbursalScene() {
  return (
    <div className="h-32 bg-slate-900 rounded-xl border border-violet-500/20 p-3 mb-5 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-[9px] font-black text-white tracking-wider uppercase">Pawn Ticket</span>
        </div>
        <span className="text-[9px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded px-1.5">#ZP-2024-0042</span>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        {[{ l: 'Customer', w: 'w-16' }, { l: 'Item', w: 'w-12' }, { l: 'Weight', w: 'w-10' }, { l: 'Loan', w: 'w-14' }].map(({ l, w }, i) => (
          <div key={l} className="bg-slate-800/60 rounded px-2 py-1">
            <div className="text-[7px] text-slate-500 mb-0.5">{l}</div>
            <motion.div
              className={`h-1.5 ${w} bg-white/30 rounded`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 + 0.2 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 items-center">
        <div className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
          <Check size={8} />Signed
        </div>
        <div className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-700/50 rounded px-2 py-1">
          <Printer size={8} />Print
        </div>
        <div className="ml-auto text-[8px] font-bold text-white bg-violet-600 rounded px-2.5 py-1">
          Disburse ₹28k
        </div>
      </div>
    </div>
  )
}

function TrackCloseScene() {
  return (
    <div className="h-32 bg-slate-900 rounded-xl border border-amber-500/20 p-3 mb-5 overflow-hidden">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-white">Loan #ZP-0042</span>
        <motion.span
          className="text-[8px] font-bold text-emerald-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >● ACTIVE</motion.span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/40 to-amber-500/20" />
        <span className="text-[8px] text-slate-500 shrink-0 px-1">61 days</span>
        <div className="flex-1 h-px bg-slate-700/60" />
        <div className="h-4 w-4 rounded-full bg-slate-700/60 border border-dashed border-slate-600 flex items-center justify-center shrink-0">
          <div className="h-1 w-1 rounded-full bg-slate-500" />
        </div>
      </div>
      <div className="flex justify-between text-[8px] mb-1">
        <span className="text-slate-500">Outstanding</span>
        <span className="text-amber-400 font-bold">₹29,560</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: '38%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      </div>
      <div className="flex gap-1">
        {[
          { l: 'Pay', c: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' },
          { l: 'Renew', c: 'bg-blue-500/15 border-blue-500/25 text-blue-400' },
          { l: 'Close → NOC', c: 'bg-slate-700/50 border-slate-600/40 text-slate-400' },
        ].map(({ l, c }) => (
          <div key={l} className={`flex-1 text-center text-[7px] font-bold border rounded py-1 ${c}`}>{l}</div>
        ))}
      </div>
    </div>
  )
}

// ── Core Feature visual panels ────────────────────────────────────────────────

function PawnTicketPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-emerald-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <FileText size={9} className="text-emerald-400" />
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">Pawn Ticket</span>
        </div>
        <span className="text-[8px] font-mono text-emerald-400/60">#ZP-2024-0078</span>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {['Customer', 'Item', 'Weight', 'Purity', 'Value', 'Loan'].map((f, i) => (
          <div key={f} className="bg-slate-800/60 rounded p-1">
            <div className="text-[6px] text-slate-600 mb-0.5">{f}</div>
            <motion.div className="h-1.5 bg-white/20 rounded" initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.3 }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 text-[7px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5"><Check size={6} />Signed</div>
        <div className="flex items-center gap-1 text-[7px] text-slate-400 bg-slate-800/50 rounded px-1.5 py-0.5"><Printer size={6} />PDF</div>
        <div className="ml-auto h-7 w-7 bg-slate-800 rounded border border-dashed border-slate-600 flex items-center justify-center">
          <span className="text-[6px] text-slate-500">QR</span>
        </div>
      </div>
    </div>
  )
}

function GoldValuationPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-amber-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2">
        <motion.div className="h-1.5 w-1.5 rounded-full bg-amber-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
        <span className="text-[9px] font-bold text-white">Live Rates · ₹/gram</span>
      </div>
      <div className="space-y-1.5 mb-2">
        {[['24K', 100, '₹9,180'], ['22K', 91, '₹8,415'], ['18K', 75, '₹6,885']].map(([lbl, pct, val], i) => (
          <div key={String(lbl)} className="flex items-center gap-2">
            <span className="text-[8px] text-amber-400/60 w-6 shrink-0">{lbl}</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: i * 0.12 }} />
            </div>
            <span className="text-[8px] font-bold text-amber-300 w-12 text-right shrink-0">{val}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-amber-500/[0.07] border border-amber-500/15 rounded-lg px-2 py-1">
        <span className="text-[8px] text-slate-500">LTV 75% →</span>
        <span className="text-[10px] font-black text-amber-400">₹28,320 eligible</span>
      </div>
    </div>
  )
}

function LoanLifecyclePreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-violet-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-white">Loan #ZP-0042</span>
        <motion.span className="text-[8px] font-bold text-emerald-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>● Active</motion.span>
      </div>
      <div className="space-y-1 mb-2">
        {[['Principal', '₹28,320', 'bg-violet-500'], ['Interest (61d)', '₹1,240', 'bg-amber-500'], ['Outstanding', '₹29,560', 'bg-emerald-500']].map(([l, v, c]) => (
          <div key={String(l)} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full ${c}`} /><span className="text-[8px] text-slate-500">{l}</span></div>
            <span className="text-[9px] font-semibold text-slate-300">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[['Take Payment', 'bg-emerald-600/20 border-emerald-600/30 text-emerald-400'], ['Close Loan', 'bg-slate-700/60 border-slate-600/40 text-slate-400']].map(([l, c]) => (
          <div key={String(l)} className={`flex-1 text-center text-[7px] font-bold border rounded py-1 ${c}`}>{l}</div>
        ))}
      </div>
    </div>
  )
}

function RenewalPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-cyan-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-bold text-white">Loan Renewal</span>
        <span className="text-[7px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-1.5 py-0.5 font-bold">RENEWAL</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-slate-800/60 rounded p-1.5">
          <div className="text-[7px] text-slate-500 mb-0.5">Interest to Pay</div>
          <div className="text-[11px] font-bold text-amber-400">₹1,240</div>
        </div>
        <div className="bg-slate-800/60 rounded p-1.5">
          <div className="text-[7px] text-slate-500 mb-0.5">New Maturity</div>
          <div className="text-[9px] font-bold text-cyan-300">Jun 2025</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 text-center text-[7px] font-bold rounded py-1 bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">Confirm Renewal</div>
        <div className="flex items-center gap-1 text-[7px] text-slate-400 bg-slate-800/50 rounded px-2 py-1"><Receipt size={7} />Receipt</div>
      </div>
    </div>
  )
}

function CustomerKYCPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-blue-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-black text-white shrink-0">RK</div>
        <div className="flex-1 min-w-0">
          <div className="h-2.5 w-20 bg-white/20 rounded mb-1" />
          <div className="h-1.5 w-24 bg-blue-400/25 rounded mb-1" />
          <div className="flex items-center gap-1"><Check size={7} className="text-emerald-400" /><span className="text-[7px] text-emerald-400">Aadhaar verified</span></div>
        </div>
      </div>
      <div className="flex gap-1">
        {['Photo', 'Aadhaar', 'Address'].map((doc) => (
          <div key={doc} className="flex-1 flex items-center justify-center gap-0.5 bg-slate-800/60 border border-slate-700/40 rounded py-1">
            <Check size={7} className="text-emerald-400" /><span className="text-[7px] text-slate-400">{doc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-rose-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-white">Overdue Alerts</span>
        <motion.span className="text-[8px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-1.5 py-0.5" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}>3 Overdue</motion.span>
      </div>
      <div className="space-y-1.5">
        {[
          ['Ravi K.', '61d', 'Overdue', 'bg-rose-400', 'bg-rose-500/10 text-rose-400'],
          ['Priya S.', '45d', 'Due Soon', 'bg-amber-400', 'bg-amber-500/10 text-amber-400'],
          ['Mohan T.', '12d', 'Active', 'bg-emerald-400', 'bg-emerald-500/10 text-emerald-400'],
        ].map(([name, days, status, dot, badge]) => (
          <div key={String(name)} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><div className={`h-1.5 w-1.5 rounded-full ${dot}`} /><span className="text-[8px] text-slate-300">{name}</span></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] text-slate-500">{days}</span>
              <span className={`text-[7px] px-1.5 py-0.5 rounded ${badge}`}>{status}</span>
              <Bell size={8} className={status === 'Overdue' ? 'text-rose-400' : 'text-slate-700'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CloudSecurityPreview() {
  return (
    <div className="h-28 bg-slate-950 rounded-xl border border-sky-500/20 p-3 mb-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-sky-400"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-[9px] font-bold text-white">Cloud Backup</span>
        </div>
        <span className="text-[7px] text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-1.5 py-0.5 font-bold">LIVE SYNC</span>
      </div>
      <div className="space-y-1.5 mb-2.5">
        {[
          { label: 'Loan data', pct: 100, color: 'from-sky-500 to-cyan-400' },
          { label: 'Customer KYC', pct: 100, color: 'from-emerald-500 to-teal-400' },
          { label: 'Photos & docs', pct: 97, color: 'from-violet-500 to-purple-400' },
        ].map(({ label, pct, color }, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[7px] text-slate-500 w-16 shrink-0">{label}</span>
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${color}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
              />
            </div>
            <span className="text-[7px] font-bold text-slate-400 w-5 text-right shrink-0">{pct}%</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[
          { label: '256-bit AES', c: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
          { label: 'RLS Secured', c: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
          { label: 'Daily Backup', c: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
        ].map(({ label, c }) => (
          <div key={label} className={`flex-1 text-center text-[6.5px] font-bold border rounded py-1 ${c}`}>{label}</div>
        ))}
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const HERO_BULLETS = [
  'Digital pawn tickets in seconds',
  'Live gold & silver rates auto-fetched',
  'Complete loan lifecycle management',
]

const HOW_IT_WORKS = [
  {
    step: '01',
    Visual: AppraisalScene,
    color: 'from-emerald-400 to-cyan-400',
    title: 'Add Customer & Appraise Item',
    desc: 'Search customer by Aadhaar or add a walk-in. Weigh the gold, enter purity, and ZiPawn calculates the metal value and eligible loan amount instantly.',
  },
  {
    step: '02',
    Visual: DisbursalScene,
    color: 'from-violet-400 to-purple-500',
    title: 'Create Pawn Ticket & Disburse',
    desc: 'Generate a numbered pawn ticket with item details, photos, and customer signature. Disburse the loan amount in cash or UPI — sanction letter prints automatically.',
  },
  {
    step: '03',
    Visual: TrackCloseScene,
    color: 'from-amber-400 to-orange-500',
    title: 'Track, Collect & Close',
    desc: 'Interest accrues daily. Take payments anytime. Send reminders for overdue loans. When customer redeems, close the loan and release the item — NOC generated instantly.',
  },
]

const CORE_FEATURES = [
  {
    Visual: PawnTicketPreview,
    color: 'from-emerald-400 to-cyan-400',
    border: 'border-emerald-500/20',
    title: 'Digital Pawn Tickets',
    desc: 'Generate auto-numbered pawn tickets instantly. Each ticket is linked to the customer, item details, weight, purity, valuation, and loan amount. Print-ready or share as PDF.',
    points: ['Auto alpha-numeric ticket codes', 'Item photos & document upload', 'Signature capture on ticket', 'PDF generation & print support'],
  },
  {
    Visual: GoldValuationPreview,
    color: 'from-amber-400 to-yellow-500',
    border: 'border-amber-500/20',
    title: 'Gold & Silver Valuation',
    desc: 'Accurate item valuation using live market rates. Supports all purity levels — 24K, 22K, 18K, 916, 750. Calculates net weight and LTV-based loan eligibility automatically.',
    points: ['Live 24K / 22K / 18K / silver rates', 'Gross & net weight entry', 'Automatic LTV loan calculation', 'Multi-item pawn in one ticket'],
  },
  {
    Visual: LoanLifecyclePreview,
    color: 'from-violet-400 to-purple-500',
    border: 'border-violet-500/20',
    title: 'Loan Lifecycle Management',
    desc: 'Track every loan from disbursement to closure. Interest accrues automatically. Staff can take payments, renew loans, or close them with one click — with receipts generated instantly.',
    points: ['Disbursement with mode (cash / UPI / bank)', 'Daily interest accrual tracking', 'Partial & full payment recording', 'Loan closure with NOC certificate'],
  },
  {
    Visual: RenewalPreview,
    color: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-500/20',
    title: 'Loan Renewal & Top-up',
    desc: 'Customers can renew overdue loans by paying accrued interest. Top-up existing loans by adding more gold. All renewal receipts are generated automatically with updated due dates.',
    points: ['Interest settlement at renewal', 'Top-up with additional gold items', 'Renewal receipt PDF generation', 'Updated maturity date tracking'],
  },
  {
    Visual: CustomerKYCPreview,
    color: 'from-blue-400 to-indigo-500',
    border: 'border-blue-500/20',
    title: 'Customer & KYC Management',
    desc: 'Aadhaar-based universal customer registry. One customer profile works across all branches. Walk-in customers are supported without Aadhaar requirement. Full KYC document upload.',
    points: ['Aadhaar hash-based deduplication', 'Photo & address proof upload', 'Walk-in customer support', 'Nominee details capture'],
  },
  {
    Visual: AlertsPreview,
    color: 'from-rose-400 to-pink-500',
    border: 'border-rose-500/20',
    title: 'Overdue Alerts & Communication',
    desc: 'Automated reminders for overdue loans. Send SMS, WhatsApp, or email notifications to customers from inside the platform. Full audit trail of all communications sent.',
    points: ['Automated overdue detection', 'SMS / WhatsApp / email channels', 'Manual reminder with preview', 'Communication audit log'],
  },
]

const BUSINESS_FEATURES = [
  { icon: BarChart2, color: 'text-emerald-400', title: 'Reports & RBI Register', desc: 'Daily outstanding report, payment summaries, interest income, and RBI-compliant pawn register. Export to PDF or CSV.' },
  { icon: Building2, color: 'text-blue-400', title: 'Multi-branch Support', desc: 'Run multiple branches under one account. Each branch has its own loan series, staff access, and reporting — fully isolated.' },
  { icon: ClipboardList, color: 'text-violet-400', title: 'Loan Schemes', desc: 'Configure multiple loan schemes with different interest rates, LTV percentages, tenure, and processing fees. Apply schemes at disbursement.' },
  { icon: ScanLine, color: 'text-amber-400', title: 'Bulk OCR Migration', desc: 'Scanning old physical loan registers? Our OCR engine reads scanned PDFs and auto-fills migration forms — 350+ receipts at once.' },
  { icon: Printer, color: 'text-cyan-400', title: 'Custom Receipt Templates', desc: 'Customise payment receipts, pawn tickets, and sanction letters with your company name, logo, and branch details.' },
  { icon: CreditCard, color: 'text-rose-400', title: 'Disbursement Tracking', desc: 'Record disbursement mode — cash, UPI, bank transfer. Track per-loan disbursement details and generate sanction letters.' },
  { icon: Search, color: 'text-indigo-400', title: 'Global Search & Spotlight', desc: 'Search any customer, ticket number, or loan code instantly from the top bar. Works across all branches.' },
  { icon: Languages, color: 'text-teal-400', title: 'Multi-language UI', desc: 'Interface available in English, Kannada, Tamil, Hindi, Telugu, Malayalam, and more. Staff can work in their preferred language.' },
  { icon: GitMerge, color: 'text-orange-400', title: 'Legacy Loan Migration', desc: 'Import your existing loan book via CSV. Validate, review, and migrate opening loans in bulk without affecting your live business.' },
  { icon: Lock, color: 'text-slate-400', title: 'Role-based Access', desc: 'Owner, manager, and staff roles with configurable permissions. Maker-checker controls for high-value transactions.' },
  { icon: Smartphone, color: 'text-pink-400', title: 'Mobile Friendly', desc: 'Works on any device — phone, tablet, desktop. No app install needed. Full functionality from any modern browser.' },
  { icon: Globe, color: 'text-sky-400', title: 'Customer Self-service Portal', desc: 'Customers can check their loan status and outstanding amount via a public portal — no login required, just ticket number.' },
]

const FAQS = [
  { q: 'Is ZiPawn compliant with RBI / state pawnbroker regulations?', a: 'ZiPawn generates RBI-format pawn registers and provides audit trails for all transactions. Compliance settings for state-specific rules can be configured in the settings panel.' },
  { q: 'Can I migrate from my existing software or manual registers?', a: 'Yes. ZiPawn provides a bulk CSV import tool for opening loan balances. For physical registers, our OCR-based bulk scan migration reads scanned PDFs and auto-fills the migration form.' },
  { q: 'How does gold rate auto-fetch work?', a: 'ZiPawn fetches live 24K, 22K, 18K, and silver rates daily. Staff can see today\'s rates on the top bar and override them manually if needed for their specific market.' },
  { q: 'Can I run multiple branches from one account?', a: 'Yes. You can add unlimited branches under one entity. Each branch has its own loan series, staff, and reports. Consolidated reports are available at the entity level.' },
  { q: 'What happens to my data? Is it secure?', a: 'All data is stored in Supabase (PostgreSQL) with row-level security. Every user only sees data they are authorised to access. Files are stored in encrypted cloud storage.' },
  { q: 'What is the trial period and how does pricing work?', a: 'ZiPawn\'s Basic plan is free for 90 days — no credit card required. After trial, you pay ₹10/day per branch (includes 2 users). Add extra branches at ₹5/day and extra users at ₹5/day. SMS/WhatsApp notifications are a one-time ₹20–25 charge per loan, covering the entire lifecycle. No monthly traps.' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function PriceCalculator() {
  const [branches, setBranches] = useState(1)
  const [extraUsers, setExtraUsers] = useState(0)
  const daily = 10 + (branches - 1) * 5 + extraUsers * 5
  const monthly = daily * 30
  return (
    <div className="mt-4 p-3.5 bg-slate-900/70 border border-emerald-500/20 rounded-xl">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cost Estimator</p>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">
            Branches: <span className="text-white font-bold">{branches}</span>
            <span className="text-slate-600 ml-1 text-[10px]">(2 users each)</span>
          </span>
          <span className="text-xs text-slate-500">{branches === 1 ? 'included' : `+₹${(branches - 1) * 5}/day`}</span>
        </div>
        <input type="range" min={1} max={5} value={branches}
          onChange={e => setBranches(+e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-slate-700" />
        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5"><span>1</span><span>5 branches</span></div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">
            Extra users: <span className="text-white font-bold">{extraUsers}</span>
          </span>
          <span className="text-xs text-slate-500">{extraUsers === 0 ? '2/branch included' : `+₹${extraUsers * 5}/day`}</span>
        </div>
        <input type="range" min={0} max={10} value={extraUsers}
          onChange={e => setExtraUsers(+e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-slate-700" />
        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5"><span>0</span><span>10 extra</span></div>
      </div>

      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Daily total</p>
          <p className="text-2xl font-black text-emerald-400 leading-none">
            ₹{daily}<span className="text-xs font-normal text-slate-500 ml-1">/day</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 mb-0.5">~Monthly</p>
          <p className="text-base font-bold text-white">₹{monthly.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[10px] bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">₹10 base</span>
        {branches > 1 && (
          <>
            <span className="text-[10px] text-slate-600">+</span>
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded px-1.5 py-0.5">
              {branches - 1} branch{branches > 2 ? 'es' : ''} ×₹5
            </span>
          </>
        )}
        {extraUsers > 0 && (
          <>
            <span className="text-[10px] text-slate-600">+</span>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded px-1.5 py-0.5">
              {extraUsers} user{extraUsers > 1 ? 's' : ''} ×₹5
            </span>
          </>
        )}
        <span className="text-[10px] text-slate-600">=</span>
        <span className="text-[10px] font-black text-emerald-400">₹{daily}/day</span>
      </div>
    </div>
  )
}

function NavBar() {
  const navigate = useNavigate()
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
            <circle cx="16" cy="16" r="8.8" fill="#6d6ade" opacity="0.9" />
            <circle cx="16" cy="16" r="4" fill="#38bdf8" />
            <circle cx="16" cy="2" r="2.5" fill="#f59e0b" />
          </svg>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-sm">Ziort</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold text-lg tracking-tight">
              Zi<span className="text-emerald-400">Pawn</span>
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => navigate('/')} className="hidden sm:block text-sm text-slate-400 hover:text-white transition px-3 py-1.5">Home</button>
          <button onClick={() => scrollTo('pricing')} className="hidden sm:block text-sm text-slate-400 hover:text-white transition px-3 py-1.5">Pricing</button>
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Login / Sign Up
          </button>
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="sm:hidden p-2 text-slate-400 hover:text-white">
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {showMobileMenu && (
        <div className="sm:hidden border-t border-slate-800/60 px-4 py-3 bg-slate-950/95">
          <div className="flex flex-col gap-2">
            <button onClick={() => { navigate('/'); setShowMobileMenu(false) }} className="text-sm text-slate-400 hover:text-white text-left px-2 py-1">Home</button>
            <button onClick={() => { scrollTo('pricing'); setShowMobileMenu(false) }} className="text-sm text-slate-400 hover:text-white text-left px-2 py-1">Pricing</button>
            <button onClick={() => { navigate('/login'); setShowMobileMenu(false) }} className="mt-2 px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-xl text-center">Login / Sign Up</button>
          </div>
        </div>
      )}
    </header>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/40 transition"
      >
        <span className="text-sm font-semibold text-white pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-emerald-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">{a}</div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ZiPawnProductPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] bg-emerald-600/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
      </div>

      <NavBar />

      {/* ══ HERO ══ */}
      <section className="relative pt-10 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1 mb-4">
              <Star size={11} className="text-emerald-400 fill-emerald-400" />
              <span className="text-emerald-300 text-[11px] font-semibold tracking-wide uppercase">Complete Pawn Shop Management Platform</span>
            </div>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 tracking-tight leading-tight">
            Run Your Pawn Shop{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400">
              Digitally. Confidently.
            </span>
          </motion.h1>

          <motion.p {...fadeUp(0.15)} className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Complete digital platform for pawnbrokers — pawn tickets, gold valuation, loan lifecycle, overdue alerts, and compliance. Paperless from day one.
          </motion.p>

          <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95"
            >
              Start Free Trial — 90 Days <ArrowRight size={16} />
            </button>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-sm rounded-xl transition-all"
            >
              View Pricing
            </button>
          </motion.div>

          <motion.div {...fadeUp(0.25)} className="flex flex-wrap justify-center gap-2">
            {[...HERO_BULLETS, '90-Day Free Trial', '₹ Indian Format & GST'].map((b) => (
              <span key={b} className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
                <Check size={10} className="text-emerald-400 shrink-0" />{b}
              </span>
            ))}
          </motion.div>

          <motion.p {...fadeUp(0.3)} className="text-[11px] text-slate-600 mt-3">
            No credit card required · Full features from day one · Cancel anytime
          </motion.p>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section className="py-14 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-8">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">From Item Pledge to Loan Closure — All in ZiPawn</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-[80px] left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-emerald-500/30 via-violet-500/30 to-amber-500/30" />
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={step.step} {...fadeUp(i * 0.12)} className="relative">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 h-full">
                  <step.Visual />
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`h-7 w-7 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg shrink-0`}>
                      <span className="text-white font-black text-xs">{step.step}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CORE FEATURES ══ */}
      <section className="py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-8">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Core Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything a Pawnbroker Needs</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Built specifically for the Indian gold loan and pawn industry — not a generic lending tool adapted for pawn shops.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {CORE_FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fadeUp(i * 0.07)} className={`bg-slate-900 border ${f.border} rounded-2xl p-5 transition-all`}>
                <f.Visual />
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-1.5 w-6 rounded-full bg-gradient-to-r ${f.color}`} />
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">{f.desc}</p>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-1.5 text-xs text-slate-400">
                      <Check size={11} className="text-emerald-400 mt-0.5 shrink-0" />{pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BUSINESS TOOLS ══ */}
      <section className="py-14 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-8">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Built-in Tools</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">More Than Just Loan Management</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">ZiPawn ships with a full suite of supporting tools so you never need another software.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUSINESS_FEATURES.map((f, i) => (
              <motion.div key={f.title} {...fadeUp(i * 0.04)}
                className="flex items-start gap-4 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-2xl p-5 transition-all cursor-default">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <f.icon size={18} className={f.color} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CLOUD & SECURITY ══ */}
      <section className="py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-8">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest mb-3">Your Data is Safe</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Enterprise-grade Security.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                Built for Pawn Shops.
              </span>
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Your loan data, customer KYC, jewellery photos, and documents never leave our encrypted cloud servers.
              Built on Supabase PostgreSQL with bank-grade security — always on, always backed up.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
            <motion.div {...fadeUp(0.1)} className="bg-slate-900 border border-sky-500/20 rounded-2xl p-5">
              <CloudSecurityPreview />
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { emoji: '🔐', title: 'End-to-end Encryption', desc: 'All data encrypted at rest with AES-256 and in transit via TLS.' },
                  { emoji: '🛡️', title: 'Row-level Security', desc: 'Each business sees only their own data. Isolation guaranteed at database level.' },
                  { emoji: '☁️', title: 'Automated Daily Backup', desc: 'Your entire database is backed up daily to multiple geographic regions.' },
                  { emoji: '📸', title: 'Photos & Documents Secure', desc: 'Customer photos, Aadhaar copies, and jewellery images stored in encrypted cloud storage.' },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                    <div className="text-xl mb-1.5">{emoji}</div>
                    <h4 className="text-xs font-bold text-white mb-1">{title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.15)} className="space-y-4">
              {[
                { icon: '☁️', color: 'from-sky-400 to-cyan-400', border: 'border-sky-500/20', bg: 'bg-sky-500/[0.06]', title: 'Automatic cloud backup — always', desc: 'ZiPawn continuously syncs every transaction, ticket, and payment to our secure cloud. Even if your device fails, not a single record is lost.' },
                { icon: '🔒', color: 'from-emerald-400 to-teal-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]', title: 'You own your data — always', desc: 'Your customer records, loan history, and files belong to you. Export your data anytime in CSV or PDF format. No vendor lock-in.' },
                { icon: '🌐', color: 'from-violet-400 to-purple-400', border: 'border-violet-500/20', bg: 'bg-violet-500/[0.06]', title: 'Access from anywhere, any device', desc: 'Open ZiPawn on your phone, tablet, or desktop — from your branch, your home, or on the road. No app install, no VPN.' },
                { icon: '🛡️', color: 'from-amber-400 to-orange-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.06]', title: 'Compliance-ready audit trail', desc: 'Every action — loan creation, payment, edit, closure — is logged with user, timestamp, and IP. Full audit trail for RBI inspections.' },
              ].map(({ icon, color, border, bg, title, desc }, i) => (
                <motion.div key={title} {...fadeUp(i * 0.08)} className={`flex items-start gap-4 border ${border} ${bg} rounded-2xl px-5 py-4`}>
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg shrink-0 shadow-lg`}>{icon}</div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.2)} className="relative overflow-hidden rounded-2xl border border-sky-500/15 bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 px-8 py-6">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 rounded-full bg-sky-500/[0.06] blur-3xl" />
            </div>
            <div className="relative flex flex-wrap justify-center gap-6 sm:gap-10">
              {[
                { icon: '🔐', label: '256-bit AES Encryption' },
                { icon: '☁️', label: 'Multi-region Backup' },
                { icon: '🛡️', label: 'Row-level Security' },
                { icon: '📵', label: 'Zero Data Sharing' },
                { icon: '🏦', label: 'Bank-grade Infrastructure' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ COMPARISON ══ */}
      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Why Switch?</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Traditional Register vs ZiPawn</h2>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="overflow-hidden rounded-2xl border border-slate-700/60">
            <div className="grid grid-cols-3 bg-slate-800/80 text-xs font-bold uppercase tracking-widest">
              <div className="px-5 py-3 text-slate-400">What you need</div>
              <div className="px-5 py-3 text-center text-red-400 border-x border-slate-700/60">Manual / Old Software</div>
              <div className="px-5 py-3 text-center text-emerald-400">ZiPawn</div>
            </div>
            {[
              ['Pawn ticket creation', 'Paper / Excel entry', 'Auto-generated, numbered, printed'],
              ['Gold valuation', 'Calculator + manual rate', 'Live rates + auto LTV calculation'],
              ['Interest tracking', 'Manual calculation daily', 'Automatic daily accrual'],
              ['Customer deduplication', 'Not possible', 'Aadhaar-based universal ID'],
              ['Overdue loan reminders', 'Phone calls manually', 'SMS / WhatsApp / Email automated'],
              ['Reports', 'Manual tally at month end', 'Live reports, export PDF / CSV'],
              ['Multi-branch management', 'Separate books', 'Single dashboard, all branches'],
              ['Legacy loan migration', 'Manual re-entry', 'Bulk CSV + OCR scan import'],
              ['RBI / compliance register', 'Separate register manually', 'Auto-generated, always up to date'],
            ].map(([what, old, neo], i) => (
              <div key={String(what)} className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'} border-t border-slate-800`}>
                <div className="px-5 py-3.5 text-slate-300 font-medium">{what}</div>
                <div className="px-5 py-3.5 text-center text-slate-500 border-x border-slate-800 flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500/70 shrink-0" />{old}
                </div>
                <div className="px-5 py-3.5 text-center text-emerald-400 flex items-center justify-center gap-1.5">
                  <Check size={13} className="shrink-0" />{neo}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" className="relative py-28 px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-violet-600/[0.04] blur-3xl" />
          <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-amber-500/[0.04] blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div {...fadeUp()} className="text-center mb-5">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">Pricing</p>
            <motion.div
              className="inline-flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-2.5 mb-6"
              animate={{ boxShadow: ['0 0 0px rgba(245,158,11,0)', '0 0 20px rgba(245,158,11,0.2)', '0 0 0px rgba(245,158,11,0)'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="text-2xl">☕</span>
              <p className="text-sm font-semibold text-amber-200">
                Less than the price of your morning chai — <span className="text-amber-400 font-black">₹10/day</span> runs your entire pawn business
              </p>
            </motion.div>

            <h2 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-3">
              ₹10<span className="text-emerald-400">/</span>day
              <span className="block text-xl sm:text-2xl font-normal text-slate-400 mt-2">per branch · 2 users included</span>
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-5">
              One owner + one staff per branch — already covered. No monthly lock-in. No hidden fees.
            </p>

            <motion.div {...fadeUp(0.05)} className="inline-flex flex-wrap justify-center gap-3">
              {[
                { icon: '☕', label: 'Morning Chai', price: '₹10–15', muted: true },
                { icon: '🍱', label: 'Office Lunch', price: '₹80–120', muted: true },
                { icon: '🏦', label: 'ZiPawn / day', price: '₹10', highlight: true },
              ].map(({ icon, label, price, highlight }) => (
                <div key={label} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 border text-sm ${highlight ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/10' : 'bg-slate-800/40 border-slate-700/50'}`}>
                  <span className="text-lg">{icon}</span>
                  <span className={highlight ? 'text-white font-bold' : 'text-slate-500'}>{label}</span>
                  <span className={`font-black text-sm ${highlight ? 'text-emerald-400' : 'text-slate-600'}`}>{price}</span>
                  {highlight && <span className="text-[10px] text-emerald-300 bg-emerald-500/20 rounded-full px-1.5 py-0.5 font-bold">YOUR PICK</span>}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { emoji: '🏢', label: '1 Branch · 2 Users', value: '₹10 / day', sub: 'owner + staff included', accent: 'border-emerald-500/30 bg-emerald-500/[0.06]' },
              { emoji: '➕', label: 'Extra Branch or User', value: '₹5 / day each', sub: 'billed separately', accent: 'border-blue-500/30 bg-blue-500/[0.06]' },
              { emoji: '📲', label: 'SMS / WhatsApp Alerts', value: '₹20–25 per loan', sub: 'full lifecycle, one-time charge', accent: 'border-violet-500/30 bg-violet-500/[0.06]' },
            ].map(({ emoji, label, value, sub, accent }) => (
              <div key={label} className={`flex items-start gap-3 border rounded-2xl px-4 py-3 max-w-[220px] ${accent}`}>
                <span className="text-2xl mt-0.5">{emoji}</span>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-none mb-1">{label}</p>
                  <p className="text-sm font-bold text-white">{value}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="max-w-2xl mx-auto mb-14">
            <div className="flex items-start gap-3 bg-violet-500/[0.05] border border-violet-500/20 rounded-2xl px-5 py-4">
              <span className="text-xl mt-0.5">💡</span>
              <div>
                <p className="text-sm font-semibold text-white mb-1">How SMS / WhatsApp notifications work</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pay <span className="text-violet-300 font-semibold">₹20–25 per customer loan</span> (like a document charge) — no subscription, no limits.
                  ZiPawn automatically sends notifications at every stage: disbursement, payment reminder, overdue alert, renewal, and closure.
                  The entire loan lifecycle is covered with one charge.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-3 gap-5 items-start">

            {/* FREE */}
            <motion.div {...fadeUp(0)}>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 h-full flex flex-col">
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 rounded-full px-3 py-1 mb-4">
                    <Star size={10} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Always Free</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Free</h3>
                  <p className="text-sm text-slate-500">Try the platform. No time limit.</p>
                </div>
                <div className="mb-5 pb-5 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">₹0</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">No credit card · No expiry</p>
                </div>
                <div className="mb-5 flex-1">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">What's included</p>
                  <ul className="space-y-2.5">
                    {[
                      { ok: true, text: '1 branch · 2 users (owner + staff)' },
                      { ok: true, text: 'Core pawn & loan management' },
                      { ok: true, text: 'Gold & silver valuation' },
                      { ok: true, text: 'Customer photo & ID upload' },
                      { ok: true, text: 'Jewellery item photos' },
                      { ok: true, text: '5 basic reports' },
                      { ok: false, text: 'SMS / WhatsApp alerts' },
                      { ok: false, text: 'Custom print templates' },
                      { ok: false, text: 'PDF & CSV export' },
                      { ok: false, text: 'Full cloud backup' },
                      { ok: false, text: 'Multi-branch support' },
                    ].map(({ ok, text }) => (
                      <li key={text} className="flex items-center gap-2.5 text-sm">
                        {ok
                          ? <div className="h-4 w-4 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0"><Check size={9} className="text-slate-400" /></div>
                          : <div className="h-4 w-4 rounded-full bg-slate-800/50 border border-slate-800 flex items-center justify-center shrink-0"><span className="text-slate-700 text-[8px] font-black">✕</span></div>
                        }
                        <span className={ok ? 'text-slate-400' : 'text-slate-700'}>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => navigate('/login')} className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white font-semibold text-sm transition-all">
                  Get Started Free
                </button>
              </div>
            </motion.div>

            {/* BASIC */}
            <motion.div {...fadeUp(0.1)} className="relative md:-mt-4">
              <div className="absolute -top-4 left-0 right-0 flex justify-center z-20">
                <motion.span
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-xl"
                  animate={{ boxShadow: ['0 0 15px rgba(16,185,129,0.4)', '0 0 30px rgba(6,182,212,0.6)', '0 0 15px rgba(16,185,129,0.4)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >★ Best Value</motion.span>
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl blur-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))' }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative rounded-2xl p-px" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(6,182,212,0.7), rgba(99,102,241,0.5))' }}>
                <div className="bg-[#090e1a] rounded-2xl p-6 flex flex-col">
                  <div className="mb-5">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-4">
                      <Zap size={10} className="text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Most Popular</span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1">Basic</h3>
                    <p className="text-sm text-slate-400">For growing single-branch shops</p>
                  </div>
                  <div className="mb-5 pb-5 border-b border-slate-800">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">₹10</span>
                      <div>
                        <p className="text-sm text-emerald-400 font-semibold leading-tight">/day · per branch</p>
                        <p className="text-[10px] text-slate-500">2 users included</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">+ ₹5/day extra branch</span>
                      <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">+ ₹5/day extra user</span>
                    </div>
                    <PriceCalculator />
                  </div>
                  <div className="mb-5 flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Everything in Free, plus</p>
                    <ul className="space-y-2.5">
                      {[
                        '1 branch + 2 users (base)',
                        'Scale: +₹5/day per extra branch or user',
                        'Customer photo & ID proof upload',
                        'Address proof & KYC documents',
                        'Jewellery item photos (multiple)',
                        'SMS / WhatsApp / email alerts',
                        'Custom print templates & receipts',
                        'PDF & CSV export',
                        'All 10+ reports',
                        'Full automated cloud backup',
                        'Overdue reminder automation',
                        'Loan scheme management',
                      ].map((text) => (
                        <li key={text} className="flex items-center gap-2.5 text-sm text-slate-200">
                          <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Check size={9} className="text-emerald-400" />
                          </div>
                          {text}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 p-3 bg-violet-500/[0.06] border border-violet-500/20 rounded-xl">
                      <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mb-1.5">📲 Notification Add-on</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="text-white font-semibold">₹20–25 per loan</span> — one-time charge covers the entire loan lifecycle: disbursal → reminders → closure notifications via SMS & WhatsApp.
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-slate-500 mb-2">☕ Costs less than your daily chai. Cancel anytime.</p>
                  <motion.button
                    onClick={() => navigate('/login')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-sm transition-all"
                    whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(16,185,129,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Start 90-Day Free Trial →
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* PRO */}
            <motion.div {...fadeUp(0.2)}>
              <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-[#120d06] to-slate-900 p-6 h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-amber-500/[0.06] blur-3xl pointer-events-none" />
                <div className="mb-5 relative z-10">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1 mb-4">
                    <Star size={10} className="text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Enterprise</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Pro</h3>
                  <p className="text-sm text-slate-400">Customised for your scale</p>
                </div>
                <div className="mb-5 pb-5 border-b border-amber-500/10 relative z-10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-amber-400">Custom</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Bulk pricing · Tailored to your branch count & volume</p>
                  <div className="mt-3 p-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Includes bulk rates for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Unlimited users', 'Unlimited branches', 'Bulk SMS/WhatsApp'].map((t) => (
                        <span key={t} className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-5 flex-1 relative z-10">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Everything in Basic, plus</p>
                  <ul className="space-y-2.5">
                    {[
                      'Unlimited branches & users',
                      'Bulk SMS / WhatsApp rates negotiated',
                      'Full cloud backup with retention history',
                      'All document & media storage included',
                      'Role-based access + maker-checker',
                      'White-label receipts & tickets',
                      'Dedicated onboarding session',
                      'Priority phone + chat support',
                      'Legacy loan migration service',
                      'API access (beta)',
                      'Custom integration support',
                    ].map((text) => (
                      <li key={text} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <div className="h-4 w-4 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                          <Check size={9} className="text-amber-400" />
                        </div>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
                <motion.button
                  onClick={() => navigate('/hub')}
                  className="relative z-10 w-full py-3.5 rounded-xl border border-amber-500/40 text-amber-300 font-black text-sm transition-all hover:bg-amber-500/10"
                  whileHover={{ boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Contact for Custom Pricing
                </motion.button>
              </div>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.3)} className="mt-10 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Free', sub: '1 branch · 2 users', price: '₹0 forever', color: 'text-slate-400' },
              { label: 'Basic', sub: '₹10/day · 2 users/branch · +₹5 each extra', price: 'from ₹300/month', color: 'text-emerald-400' },
              { label: 'Pro', sub: 'Unlimited · bulk rates', price: 'Custom pricing', color: 'text-amber-400' },
            ].map(({ label, sub, price, color }) => (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl py-3 px-4">
                <p className={`text-xs font-black uppercase tracking-wider ${color} mb-0.5`}>{label}</p>
                <p className="text-[10px] text-slate-500 leading-snug">{sub}</p>
                <p className="text-sm font-bold text-white mt-0.5">{price}</p>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.4)} className="text-center mt-8 space-y-1.5">
            <p className="text-sm text-slate-500">
              🎯 <span className="text-white font-semibold">Early adopter pricing</span> — rates locked in for life when you sign up now.
            </p>
            <p className="text-xs text-slate-600">
              Prices excl. GST · 90-day free trial · Payment gateway integration coming soon · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Common Questions</h2>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="space-y-3">
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </motion.div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-cyan-600/10 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-4 py-1.5 mb-6">
              <Zap size={13} className="text-emerald-400" />
              <span className="text-emerald-300 text-xs font-semibold">90 Days Free · No Credit Card</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to Digitise Your Pawn Shop?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
              Join pawnbrokers across India who have moved from paper registers to ZiPawn.
              Get started in under 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-base rounded-2xl transition-all shadow-2xl shadow-emerald-500/25 hover:scale-105 active:scale-95"
              >
                Start Free Trial <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/hub')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-base rounded-2xl transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
              <circle cx="16" cy="16" r="8.8" fill="#6d6ade" opacity="0.9" />
              <circle cx="16" cy="16" r="4" fill="#38bdf8" />
              <circle cx="16" cy="2" r="2.5" fill="#f59e0b" />
            </svg>
            <span className="text-white font-bold">Ziort</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 font-semibold">ZiPawn</span>
          </div>
          <div className="flex gap-5 text-sm text-slate-500">
            {['/', 'product', 'login'].map((p) => (
              <a key={p} href={`/${p === '/' ? '' : p}`} className="hover:text-white transition-colors capitalize">
                {p === '/' ? 'Home' : p}
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Ziort. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
