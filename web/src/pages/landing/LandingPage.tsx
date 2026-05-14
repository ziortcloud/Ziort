// Ziort Home — replica of zibiz.in home (dark aurora / glass style)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, X, Menu, Check } from 'lucide-react'

const fd = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
})

// ── Landing product → hub product code mapping ────────────────────────────────
// Only the 4 products that are fully built get direct-trial intent
const PRODUCT_CODE_MAP: Record<string, string> = {
  zipawn:   'ZPN',
  zifleet:  'ZFLT',
  ziload:   'ZLD',
  zidriver: 'ZDR',
}

// ── Product registry ──────────────────────────────────────────────────────────

const products = [
  {
    id: 'zipawn', name: 'ZiPawn', emoji: '🏪', abbr: 'ZP',
    tagline: 'Smart Pawn Shop Management',
    desc: 'Digital pawn tickets, live gold valuation, loan lifecycle & overdue alerts — built for Indian pawnbrokers.',
    color: 'from-emerald-400 to-cyan-400',
    glow: 'rgba(52,211,153,0.22)', glowBorder: 'rgba(52,211,153,0.35)', themeColor: '#34d399',
    features: ['Pawn Tickets', 'Gold Valuation', 'Loan Tracking', 'Overdue Alerts'],
    badge: 'Most Popular', route: '/product/zipawn',
  },
  {
    id: 'zishop', name: 'ZiShop', emoji: '🛒', abbr: 'ZS',
    tagline: 'Complete Shop Management',
    desc: 'Smart POS billing, live inventory, udhaar book, purchases & GST reports for kirana, jewellery & retail.',
    color: 'from-amber-400 to-orange-500',
    glow: 'rgba(251,191,36,0.22)', glowBorder: 'rgba(251,191,36,0.35)', themeColor: '#fbbf24',
    features: ['Smart POS Billing', 'Live Inventory', 'Udhaar Book', 'GST Reports'],
    route: '/product/zishop',
  },
  {
    id: 'ziledger', name: 'ZiLedger', emoji: '📒', abbr: 'ZL',
    tagline: 'GST Billing & Accounting',
    desc: 'Create GST-compliant invoices, track payments, manage customers and items for Indian small businesses.',
    color: 'from-indigo-400 to-violet-500',
    glow: 'rgba(99,102,241,0.22)', glowBorder: 'rgba(99,102,241,0.35)', themeColor: '#6366f1',
    features: ['GST Invoices', 'Payment Tracking', 'Auto GST Calc', 'Expense Reports'],
    route: '/product/ziledger',
  },
  {
    id: 'zicalc', name: 'ZiCalc', emoji: '🧮', abbr: 'ZC',
    tagline: 'Financial Calculators Suite',
    desc: 'Free online calculators for interest, SIP, loans, dates, and time. Perfect for quick financial planning.',
    color: 'from-indigo-400 to-purple-400',
    glow: 'rgba(129,140,248,0.22)', glowBorder: 'rgba(129,140,248,0.35)', themeColor: '#818cf8',
    features: ['Interest Calculator', 'SIP Calculator', 'Loan Calculator', 'Date & Time'],
    route: '/product/zicalc',
  },
  {
    id: 'zireceipt', name: 'ZiReceipt', emoji: '🧾', abbr: 'ZR',
    tagline: 'Smart Receipt Generator',
    desc: 'Create professional receipts instantly. No signup required. Print or download as PDF in seconds.',
    color: 'from-orange-400 to-red-400',
    glow: 'rgba(251,146,60,0.22)', glowBorder: 'rgba(251,146,60,0.35)', themeColor: '#fb923c',
    features: ['Receipt Types', 'Tax Support', 'Print & Download', 'Custom Branding'],
    route: '/product/zireceipt',
  },
  {
    id: 'ziinvoice', name: 'ZiInvoice', emoji: '📄', abbr: 'ZI',
    tagline: 'Professional Invoice Generator',
    desc: 'Create GST-compliant invoices with customizable templates, tax calculations, and payment tracking.',
    color: 'from-blue-400 to-purple-400',
    glow: 'rgba(96,165,250,0.22)', glowBorder: 'rgba(96,165,250,0.35)', themeColor: '#60a5fa',
    features: ['GST Compliant', '9 Invoice Types', 'Templates', 'Payment Tracking'],
    route: '/product/ziinvoice',
  },
  {
    id: 'ziquote', name: 'ZiQuote', emoji: '📋', abbr: 'ZQ',
    tagline: 'Smart Quotation Generator',
    desc: 'Create professional quotations and convert them seamlessly into invoices with client approval.',
    color: 'from-teal-400 to-cyan-400',
    glow: 'rgba(45,212,191,0.22)', glowBorder: 'rgba(45,212,191,0.35)', themeColor: '#2dd4bf',
    features: ['Quotation Types', 'Client Approval', 'Convert to Invoice', 'Templates'],
    route: '/product/ziquote',
  },
  {
    id: 'ziscan', name: 'ZiScan', emoji: '🔍', abbr: 'ZS',
    tagline: 'Smart Document Scanner',
    desc: 'Scan receipts, invoices, bills and convert to editable documents with AI-powered OCR.',
    color: 'from-violet-400 to-fuchsia-400',
    glow: 'rgba(167,139,250,0.22)', glowBorder: 'rgba(167,139,250,0.35)', themeColor: '#a78bfa',
    features: ['Smart OCR', 'Multi-Format', 'Editable Output', 'Convert & Export'],
    route: '/product/ziscan',
  },
  {
    id: 'zipost', name: 'ZiPost', emoji: '📢', abbr: 'ZP',
    tagline: 'Hyperlocal Ads & Listings',
    desc: 'Post free buy/sell ads for gold, jewellery, electronics and more. Browse local listings without signup.',
    color: 'from-rose-400 to-pink-400',
    glow: 'rgba(251,113,133,0.22)', glowBorder: 'rgba(251,113,133,0.35)', themeColor: '#fb7185',
    features: ['Free Listings', 'Browse Locally', 'No Signup', 'Post in Minutes'],
    route: '/product/zipost',
  },
  {
    id: 'zifleet', name: 'ZiFleet', emoji: '🚛', abbr: 'ZF',
    tagline: 'Fleet & Trip Management',
    desc: 'Track your vehicles, drivers and trips in real-time. Fuel logs, expense tracking, and live GPS updates.',
    color: 'from-amber-400 to-yellow-500',
    glow: 'rgba(251,191,36,0.22)', glowBorder: 'rgba(251,191,36,0.35)', themeColor: '#fbbf24',
    features: ['Live Tracking', 'Trip Management', 'Fuel Logs', 'Driver Records'],
    route: '/product/zifleet',
  },
  {
    id: 'ziload', name: 'ZiLoad', emoji: '📦', abbr: 'ZD',
    tagline: 'Goods Transport & Logistics',
    desc: 'Post loads, find trucks and match transporters across India. The open load board for shippers and truck owners.',
    color: 'from-blue-400 to-cyan-500',
    glow: 'rgba(96,165,250,0.22)', glowBorder: 'rgba(96,165,250,0.35)', themeColor: '#60a5fa',
    features: ['Load Board', 'Bid System', 'Instant Matching', 'Booking Management'],
    route: '/product/ziload',
  },
  {
    id: 'zibuild', name: 'ZiBuild', emoji: '🏗️', abbr: 'ZB',
    tagline: 'Real Estate & Project Sales',
    desc: 'Order cement, sand and steel directly from verified local dealers. Compare live prices, track delivery.',
    color: 'from-orange-500 to-red-500',
    glow: 'rgba(249,115,22,0.22)', glowBorder: 'rgba(249,115,22,0.35)', themeColor: '#f97316',
    features: ['Live Material Prices', 'Verified Suppliers', 'Delivery Tracking', 'Digital Invoices'],
    badge: 'New', route: '/product/zibuild',
  },
  {
    id: 'zifood', name: 'ZiFood', emoji: '🍽️', abbr: 'ZF',
    tagline: 'Restaurant & Kitchen Orders',
    desc: 'Table management, KOT printing, billing, kitchen display, and daily sales reports for restaurants & cafés.',
    color: 'from-red-500 to-orange-500',
    glow: 'rgba(239,68,68,0.22)', glowBorder: 'rgba(239,68,68,0.35)', themeColor: '#ef4444',
    features: ['Table Management', 'KOT Printing', 'Kitchen Display', 'Daily Reports'],
    route: '/product/zifood',
  },
  {
    id: 'zicare', name: 'ZiCare', emoji: '🏥', abbr: 'ZC',
    tagline: 'Clinic & Patient Management',
    desc: 'OPD queue, prescriptions, patient records, billing, and inventory for clinics, hospitals and pharmacies.',
    color: 'from-teal-500 to-cyan-500',
    glow: 'rgba(20,184,166,0.22)', glowBorder: 'rgba(20,184,166,0.35)', themeColor: '#14b8a6',
    features: ['OPD Queue', 'Prescriptions', 'Patient Records', 'Pharmacy Billing'],
    route: '/product/zicare',
  },
  {
    id: 'ziyield', name: 'ZiYield', emoji: '🌾', abbr: 'ZY',
    tagline: 'Farm & Agriculture Management',
    desc: 'Track farm records, crop seasons, expenses, harvest, mandi rates and agri marketplace for Indian farmers.',
    color: 'from-green-500 to-lime-500',
    glow: 'rgba(34,197,94,0.22)', glowBorder: 'rgba(34,197,94,0.35)', themeColor: '#22c55e',
    features: ['Farm Records', 'Crop Seasons', 'Mandi Rates', 'Agri Marketplace'],
    route: '/product/ziyield',
  },
  {
    id: 'zichit', name: 'ZiChit', emoji: '🪙', abbr: 'ZCH',
    tagline: 'Chit Fund & Pigmy Schemes',
    desc: 'Run chit groups, manage member savings (pigmy), disburse loans and track field collection.',
    color: 'from-amber-500 to-yellow-500',
    glow: 'rgba(245,158,11,0.22)', glowBorder: 'rgba(245,158,11,0.35)', themeColor: '#f59e0b',
    features: ['Chit Groups', 'Pigmy Savings', 'Loan Book', 'Field Collection'],
    badge: 'New', route: '/product/zichit',
  },
  {
    id: 'zipartner', name: 'ZiPartner', emoji: '🤝', abbr: 'ZN',
    tagline: 'Referral & Partner Network',
    desc: "Join Ziort's referral network. Earn 20% commission for every business you onboard.",
    color: 'from-green-400 to-emerald-500',
    glow: 'rgba(74,222,128,0.22)', glowBorder: 'rgba(74,222,128,0.35)', themeColor: '#4ade80',
    features: ['20% Commission', 'Monthly Payouts', 'UPI Transfer', 'Rank & Rewards'],
    badge: 'Earn Money', route: '/product/zipartner',
  },
  {
    id: 'zipulse', name: 'ZiPulse', emoji: '⚡', abbr: 'ZPL',
    tagline: 'CRM & Sales Pipeline',
    desc: 'Manage leads, follow-ups, customer journeys and sales pipelines for growing businesses.',
    color: 'from-violet-500 to-purple-500',
    glow: 'rgba(139,92,246,0.22)', glowBorder: 'rgba(139,92,246,0.35)', themeColor: '#8b5cf6',
    features: ['Lead Management', 'Follow-up Alerts', 'Sales Pipeline', 'Customer Journey'],
    route: '/product/zipulse',
  },
  {
    id: 'zineed', name: 'ZiNeed', emoji: '🛍️', abbr: 'ZND',
    tagline: 'B2B Procurement Platform',
    desc: 'Source raw materials and products from verified B2B suppliers across India. Compare, order and track.',
    color: 'from-pink-500 to-rose-500',
    glow: 'rgba(236,72,153,0.22)', glowBorder: 'rgba(236,72,153,0.35)', themeColor: '#ec4899',
    features: ['B2B Sourcing', 'Verified Suppliers', 'Bulk Orders', 'Price Comparison'],
    route: '/product/zineed',
  },
]

const TRUST_PILLARS = [
  { icon: '☁️', title: 'Cloud Powered', desc: 'Access your data from any device, anywhere. Always in sync.' },
  { icon: '🔐', title: 'Bank-grade Security', desc: 'Row-level encryption. Only you see your business data.' },
  { icon: '🇮🇳', title: 'Built for India', desc: '₹ format, GST compliance, Indian languages & local needs.' },
  { icon: '💰', title: 'Start Free', desc: 'Free forever plan + 90-day full trial. No credit card needed.' },
]

// ── Animated SVG icons ────────────────────────────────────────────────────────

function ProductIcon({ id, size = 28 }: { id: string; size?: number }) {
  const w = size, h = size
  switch (id) {
    case 'zipawn': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zp{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(13deg)}}`}</style>
        <line x1="20" y1="9" x2="20" y2="33" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="13" y1="33" x2="27" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <g style={{transformOrigin:'20px 13px',animation:'zp 2.6s ease-in-out infinite'}}>
          <line x1="7" y1="13" x2="33" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="13" x2="7" y2="20" stroke="rgba(255,255,255,0.55)" strokeWidth="1"/>
          <line x1="33" y1="13" x2="33" y2="20" stroke="rgba(255,255,255,0.55)" strokeWidth="1"/>
          <path d="M3.5 22 Q7 20 10.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M29.5 22 Q33 20 36.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="7,19.5 9.5,16.5 12,19.5 9.5,22.5" fill="rgba(180,220,255,0.95)"/>
          <circle cx="33" cy="19.5" r="2.2" fill="rgba(255,210,60,0.9)" stroke="white" strokeWidth="0.7"/>
        </g>
      </svg>
    )
    case 'zishop': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zsh{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <path d="M7 13 L10 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 13 L33 13 L29 26 L11 26 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.12)" strokeLinejoin="round"/>
        <rect x="14" y="16" width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.65)"/>
        <rect x="20" y="16" width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <rect x="26" y="16" width="3" height="4" rx="0.5" fill="rgba(255,255,255,0.55)"/>
        <circle cx="15" cy="31" r="3.5" stroke="white" strokeWidth="1.4" fill="rgba(255,255,255,0.08)"/>
        <g style={{transformOrigin:'15px 31px',animation:'zsh 1.4s linear infinite'}}>
          <line x1="15" y1="27.5" x2="15" y2="34.5" stroke="white" strokeWidth="1.1"/>
          <line x1="11.5" y1="31" x2="18.5" y2="31" stroke="white" strokeWidth="1.1"/>
        </g>
        <circle cx="28" cy="31" r="3.5" stroke="white" strokeWidth="1.4" fill="rgba(255,255,255,0.08)"/>
        <g style={{transformOrigin:'28px 31px',animation:'zsh 1.4s linear infinite'}}>
          <line x1="28" y1="27.5" x2="28" y2="34.5" stroke="white" strokeWidth="1.1"/>
          <line x1="24.5" y1="31" x2="31.5" y2="31" stroke="white" strokeWidth="1.1"/>
        </g>
      </svg>
    )
    case 'ziledger': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zl{0%,30%,100%{transform:scaleX(1)}50%,70%{transform:scaleX(0)}}`}</style>
        <rect x="6" y="6" width="13" height="27" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        {[11,15,19,23,26].map(y=><line key={y} x1="9" y1={y} x2="16" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
        <line x1="19" y1="6" x2="19" y2="33" stroke="white" strokeWidth="1.5"/>
        <g style={{transformOrigin:'19px 19.5px',animation:'zl 3.5s ease-in-out infinite'}}>
          <rect x="19" y="6" width="13" height="27" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
          {[11,15,19,23,26].map(y=><line key={y} x1="22" y1={y} x2="29" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
        </g>
      </svg>
    )
    case 'zicalc': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zcc{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
        <rect x="6" y="4" width="28" height="32" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        <rect x="9" y="8" width="22" height="8" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1"/>
        <text x="28" y="15" fontSize="5.5" fill="rgba(255,255,255,0.6)" textAnchor="end" fontFamily="monospace">3.14</text>
        <line x1="29" y1="10" x2="29" y2="14.5" stroke="white" strokeWidth="1.4" style={{animation:'zcc 1s step-start infinite'}}/>
        {[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[0,3],[1,3],[2,3]].map(([c,r],i)=>(
          <rect key={i} x={10+c*7} y={20+r*4} width="5" height="3" rx="0.8" fill="rgba(255,255,255,0.32)"/>
        ))}
      </svg>
    )
    case 'zireceipt': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zr{0%,100%{transform:translateY(0)}50%{transform:translateY(2.5px)}}`}</style>
        <rect x="8" y="3" width="24" height="11" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)"/>
        <rect x="12" y="6.5" width="5" height="1.5" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <rect x="19" y="6.5" width="5" height="1.5" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <circle cx="29" cy="7.5" r="1.5" fill="rgba(255,255,255,0.3)"/>
        <g style={{animation:'zr 2s ease-in-out infinite'}}>
          <rect x="13" y="14" width="14" height="20" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.08)"/>
          {[18,21,24,28].map(y=><line key={y} x1="16" y1={y} x2="24" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
          <path d="M13 34 L15.5 32 L18 34 L20.5 32 L23 34 L25.5 32 L27 33.5" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    )
    case 'ziinvoice': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zi{0%,55%{transform:scale(0) rotate(-25deg);opacity:0}70%{transform:scale(1.18) rotate(6deg);opacity:1}82%,100%{transform:scale(1) rotate(-7deg);opacity:1}}`}</style>
        <rect x="4" y="3" width="23" height="29" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <rect x="7" y="7" width="17" height="2.5" rx="0.8" fill="rgba(255,255,255,0.38)"/>
        {[13,17,21].map(y=><line key={y} x1="7" y1={y} x2="23" y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="0.9"/>)}
        <g style={{transformOrigin:'28px 27px',animation:'zi 3.5s ease-out infinite'}}>
          <circle cx="28" cy="27" r="9.5" stroke="rgba(74,222,128,0.85)" strokeWidth="2" fill="rgba(0,15,5,0.5)"/>
          <text x="28" y="30" textAnchor="middle" fontSize="5.2" fontWeight="900" fill="rgba(74,222,128,0.9)" fontFamily="monospace">PAID</text>
        </g>
      </svg>
    )
    case 'ziquote': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zq{0%{stroke-dashoffset:20}65%,100%{stroke-dashoffset:0}}`}</style>
        <rect x="6" y="3" width="23" height="29" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <line x1="9" y1="10" x2="25" y2="10" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"/>
        <line x1="9" y1="14" x2="25" y2="14" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"/>
        <text x="9" y="24" fontSize="13" fill="rgba(255,255,255,0.75)" fontFamily="Georgia,serif">"</text>
        <text x="18" y="24" fontSize="13" fill="rgba(255,255,255,0.75)" fontFamily="Georgia,serif">"</text>
        <line x1="9" y1="28" x2="29" y2="28" stroke="white" strokeWidth="1.6" strokeLinecap="round"
          style={{strokeDasharray:'20',strokeDashoffset:'20',animation:'zq 2.5s ease-in-out infinite'}}/>
      </svg>
    )
    case 'ziscan': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zsb{0%,100%{transform:translateY(0);opacity:0.95}82%{transform:translateY(19px);opacity:0.35}}`}</style>
        <rect x="8" y="4" width="20" height="26" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <path d="M22 4 L28 10 L22 10 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1"/>
        {[13,17,21].map(y=><line key={y} x1="11" y1={y} x2="22" y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="0.9"/>)}
        <line x1="6" y1="10" x2="30" y2="10" stroke="rgba(80,220,255,0.9)" strokeWidth="2" strokeLinecap="round"
          style={{filter:'drop-shadow(0 0 4px rgba(80,220,255,0.85))',animation:'zsb 2s ease-in-out infinite'}}/>
        <path d="M33 5 L37 5 L37 9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M33 35 L37 35 L37 31" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
    case 'zipost': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zw1{0%,100%{opacity:0.9}50%{opacity:0.3}} @keyframes zw2{0%,100%{opacity:0.65}50%{opacity:0.15}}`}</style>
        <path d="M5 16 L16 13 L16 27 L5 24 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)" strokeLinejoin="round"/>
        <path d="M16 12 L25 7 L25 33 L16 28 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.22)" strokeLinejoin="round"/>
        <line x1="4" y1="16" x2="4" y2="24" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <g style={{animation:'zw1 1.6s ease-in-out infinite'}}>
          <path d="M28 15 Q32 20 28 25" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        </g>
        <g style={{animation:'zw2 1.6s ease-in-out infinite 0.35s'}}>
          <path d="M31 12 Q37 20 31 28" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    )
    case 'zifleet': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zfl{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <rect x="2" y="13" width="22" height="12" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
        <rect x="24" y="16" width="14" height="9" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.16)"/>
        <rect x="27" y="18" width="6" height="4" rx="0.5" fill="rgba(135,210,255,0.35)" stroke="white" strokeWidth="0.8"/>
        <line x1="37" y1="21" x2="39" y2="21" stroke="rgba(255,220,80,0.8)" strokeWidth="2" strokeLinecap="round"/>
        {[9,20,30].map(cx=>(
          <g key={cx}>
            <circle cx={cx} cy="28" r="3.5" stroke="white" strokeWidth="1.3" fill="rgba(20,20,20,0.6)"/>
            <g style={{transformOrigin:`${cx}px 28px`,animation:'zfl 1.2s linear infinite'}}>
              <line x1={cx} y1="24.5" x2={cx} y2="31.5" stroke="white" strokeWidth="1"/>
              <line x1={cx-3.5} y1="28" x2={cx+3.5} y2="28" stroke="white" strokeWidth="1"/>
            </g>
          </g>
        ))}
      </svg>
    )
    case 'ziload': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zld{0%,100%{transform:translateY(0)}50%{transform:translateY(-4.5px)}}`}</style>
        <g style={{animation:'zld 2s ease-in-out infinite'}}>
          <rect x="9" y="19" width="22" height="16" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
          <line x1="20" y1="19" x2="20" y2="35" stroke="rgba(255,255,255,0.42)" strokeWidth="1"/>
          <line x1="9" y1="27" x2="31" y2="27" stroke="rgba(255,255,255,0.42)" strokeWidth="1"/>
          <line x1="20" y1="4" x2="20" y2="17" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
          <path d="M14.5 9 L20 3.5 L25.5 9" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </g>
      </svg>
    )
    case 'zibuild': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zb{0%,100%{transform:translateY(0)}38%{transform:translateY(-3.5px)}65%{transform:translateY(-1.5px)}}`}</style>
        <g style={{animation:'zb 2.4s ease-in-out infinite'}}>
          <path d="M7 22 Q7 9 20 8 Q33 9 33 22 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.16)"/>
          <path d="M4 22 Q4 25.5 20 25.5 Q36 25.5 36 22 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.26)"/>
          <path d="M13 17 Q17 15 20 15 Q23 15 27 17" stroke="rgba(255,200,40,0.9)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </g>
        <rect x="5" y="29" width="13" height="5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
        <rect x="19" y="29" width="13" height="5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
        <rect x="12" y="34" width="13" height="4.5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
      </svg>
    )
    case 'zifood': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zst{0%,100%{transform:translateY(0);opacity:0.75}70%{transform:translateY(-9px);opacity:0}}`}</style>
        <path d="M13 15 Q11 11 14 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{animation:'zst 2s ease-out infinite'}}/>
        <path d="M20 13 Q18 9 20 6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{animation:'zst 2s ease-out infinite 0.45s'}}/>
        <path d="M27 15 Q25 11 27 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{animation:'zst 2s ease-out infinite 0.9s'}}/>
        <path d="M5 26 Q5 16 20 15 Q35 16 35 26 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)"/>
        <ellipse cx="20" cy="28" rx="15.5" ry="4" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        <circle cx="20" cy="16.5" r="2" fill="white"/>
      </svg>
    )
    case 'zicare': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zchr{0%,100%{transform:scale(1)}28%{transform:scale(1.14)}60%{transform:scale(0.96)}} @keyframes zcecg{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}`}</style>
        <g style={{transformOrigin:'20px 16px',animation:'zchr 1.25s ease-in-out infinite'}}>
          <path d="M20 28 C8 20 5 15 5 12 A8 8 0 0 1 20 9 A8 8 0 0 1 35 12 C35 15 32 20 20 28Z" stroke="white" strokeWidth="1.5" fill="rgba(239,68,68,0.28)"/>
        </g>
        <path d="M3 24 L9 24 L12 20 L15 28 L18 14 L21 24 L24 24 L27 24 L30 19 L33 24 L37 24"
          stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{strokeDasharray:'60',strokeDashoffset:'60',animation:'zcecg 2.2s linear infinite'}}/>
      </svg>
    )
    case 'ziyield': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zyw1{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}} @keyframes zyw2{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}`}</style>
        <circle cx="31" cy="8" r="4" fill="rgba(255,225,0,0.82)"/>
        <g style={{transformOrigin:'13px 34px',animation:'zyw1 2.3s ease-in-out infinite'}}>
          <line x1="13" y1="17" x2="13" y2="34" stroke="rgba(200,175,90,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
          <ellipse cx="13" cy="12" rx="3" ry="5" fill="rgba(225,195,70,0.85)" stroke="rgba(190,155,40,0.9)" strokeWidth="0.8"/>
        </g>
        <g style={{transformOrigin:'23px 34px',animation:'zyw2 2.3s ease-in-out infinite 0.5s'}}>
          <line x1="23" y1="20" x2="23" y2="34" stroke="rgba(200,175,90,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
          <ellipse cx="23" cy="15" rx="3" ry="5" fill="rgba(225,195,70,0.85)" stroke="rgba(190,155,40,0.9)" strokeWidth="0.8"/>
        </g>
        <line x1="3" y1="35" x2="37" y2="35" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    )
    case 'zichit': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zch{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <g style={{transformOrigin:'20px 20px',animation:'zch 3s linear infinite'}}>
          <circle cx="20" cy="20" r="14" stroke="rgba(245,158,11,0.6)" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/>
          <circle cx="20" cy="20" r="10" stroke="rgba(245,158,11,0.4)" strokeWidth="1" fill="none" strokeDasharray="3 3"/>
        </g>
        <circle cx="20" cy="20" r="7" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.8)" strokeWidth="1.5"/>
        <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="bold" fill="rgba(245,158,11,0.9)" fontFamily="sans-serif">₹</text>
      </svg>
    )
    case 'zipartner': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes znl{0%,100%{transform:translateX(0)}50%{transform:translateX(2.5px)}} @keyframes znr{0%,100%{transform:translateX(0)}50%{transform:translateX(-2.5px)}} @keyframes zng{0%,100%{transform:scale(1);opacity:0.85}50%{transform:scale(1.18);opacity:1}}`}</style>
        <g style={{animation:'znl 1.9s ease-in-out infinite'}}>
          <path d="M3 24 L3 21 C3 19 5 18 7 19.5 L8 18.5 C8 16.5 10 16.5 11 18.5 L12 17.5 C12 15.5 14 15.5 15 17.5 L15 23 L12 28 L3 28 Z" stroke="white" strokeWidth="1.3" fill="rgba(255,255,255,0.13)" strokeLinejoin="round"/>
        </g>
        <g style={{animation:'znr 1.9s ease-in-out infinite'}}>
          <path d="M37 24 L37 21 C37 19 35 18 33 19.5 L32 18.5 C32 16.5 30 16.5 29 18.5 L28 17.5 C28 15.5 26 15.5 25 17.5 L25 23 L28 28 L37 28 Z" stroke="white" strokeWidth="1.3" fill="rgba(255,255,255,0.13)" strokeLinejoin="round"/>
        </g>
        <path d="M15 22 L25 22" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
        <g style={{transformOrigin:'20px 10px',animation:'zng 2s ease-in-out infinite'}}>
          <circle cx="20" cy="10" r="6" fill="rgba(255,200,0,0.7)" stroke="rgba(255,215,0,0.88)" strokeWidth="1.3"/>
          <text x="20" y="13.5" textAnchor="middle" fontSize="7.5" fill="white" fontWeight="bold" fontFamily="sans-serif">₹</text>
        </g>
      </svg>
    )
    case 'zipulse': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zpl{0%{stroke-dashoffset:80}100%{stroke-dashoffset:0}}`}</style>
        <path d="M3 20 L10 20 L14 12 L18 28 L22 16 L26 24 L30 20 L37 20"
          stroke="rgba(139,92,246,0.9)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{strokeDasharray:'80',strokeDashoffset:'80',animation:'zpl 2s ease-in-out infinite'}}/>
        <circle cx="20" cy="20" r="3" fill="rgba(139,92,246,0.5)" stroke="rgba(139,92,246,0.9)" strokeWidth="1.5"/>
      </svg>
    )
    case 'zineed': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes ztick{0%,100%{opacity:0;transform:scale(0.5)}30%,70%{opacity:1;transform:scale(1)}}`}</style>
        <rect x="8" y="6" width="24" height="30" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        {[13,20,27].map((y,i)=>(
          <g key={y}>
            <line x1="14" y1={y} x2="28" y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <g style={{transformOrigin:`12px ${y}px`,animation:`ztick 2s ease-in-out infinite ${i*0.4}s`}}>
              <path d={`M10 ${y-1.5} L12 ${y+1} L14.5 ${y-2}`} stroke="rgba(236,72,153,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </g>
        ))}
      </svg>
    )
    default:
      return <span className="text-white font-black text-xs">{id.slice(0,2).toUpperCase()}</span>
  }
}

// ── Auth prompt card ──────────────────────────────────────────────────────────

type Product = typeof products[0]

function AuthPromptCard({ product }: { product: Product }) {
  const navigate = useNavigate()

  function startTrial() {
    const code = PRODUCT_CODE_MAP[product.id]
    if (code) localStorage.setItem('zi_product_intent', code)
    navigate('/register')
  }

  function goLogin() {
    const code = PRODUCT_CODE_MAP[product.id]
    if (code) localStorage.setItem('zi_product_intent', code)
    navigate('/login')
  }

  return (
    <div className="w-full max-w-xs">
      <div className="bg-white/[0.04] border border-white/[0.09] rounded-2xl p-6 backdrop-blur-xl">
        <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${product.color} rounded-xl px-3 py-1.5 mb-5`}>
          <span className="text-sm">{product.emoji}</span>
          <span className="text-xs font-bold text-white">{product.name}</span>
        </div>

        <h3 className="text-base font-bold text-white mb-1">Get started free</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          180-day full trial · No credit card · Cancel anytime
        </p>

        <div className="space-y-2.5 mb-5">
          {product.features.map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: product.glow.replace('0.22','0.25'), border: `1px solid ${product.glowBorder}` }}>
                <Check size={9} style={{ color: product.themeColor }} />
              </div>
              <span className="text-xs text-slate-300">{f}</span>
            </div>
          ))}
        </div>

        <motion.button
          onClick={startTrial}
          className="w-full py-3 rounded-xl font-bold text-sm text-white mb-2.5 transition-all"
          style={{ background: `linear-gradient(135deg, ${product.themeColor}, ${product.themeColor}cc)` }}
          whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${product.glow}` }}
          whileTap={{ scale: 0.97 }}
        >
          Start Free Trial →
        </motion.button>

        <button onClick={goLogin}
          className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all font-medium">
          Already have an account? Login
        </button>

        <p className="text-center text-[10px] text-slate-700 mt-3">
          Free plan available · No commitment
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const selectedProduct = products.find(p => p.id === selected) ?? null

  return (
    <div className="min-h-screen bg-[#030811] text-white overflow-x-hidden">

      {/* ── Aurora background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full blur-[130px]"
          style={{ background: 'rgba(16,185,129,0.07)', top: '-15%', left: '-15%' }}
          animate={{ x: [0, 50, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[110px]"
          style={{ background: 'rgba(99,102,241,0.06)', bottom: '-10%', right: '-10%' }}
          animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-[90px]"
          style={{ background: 'rgba(245,158,11,0.04)', top: '45%', left: '42%' }}
          animate={{ x: [0, 60, -20, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── NavBar ── */}
      <header className="sticky top-0 z-50 bg-[#030811]/70 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35"/>
              <circle cx="20" cy="20" r="11" fill="#6d6ade" opacity="0.9"/>
              <circle cx="20" cy="20" r="5" fill="#38bdf8"/>
              <circle cx="20" cy="2" r="3" fill="#f59e0b"/>
            </svg>
            <span className="text-white font-bold text-xl tracking-tight">Ziort</span>
          </button>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => navigate('/product/zipartner')}
                className="px-3 py-1.5 text-sm text-green-400 hover:text-green-300 font-semibold transition-colors rounded-lg hover:bg-green-500/[0.07]">
                Earn 💼
              </button>
              <button onClick={() => navigate('/login')}
                className="ml-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                Login / Sign Up
              </button>
            </div>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="sm:hidden p-2 text-slate-400 hover:text-white">
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="sm:hidden border-t border-white/[0.05] px-4 py-4 bg-[#030811]/95">
            <div className="flex flex-col gap-2">
              <button onClick={() => { navigate('/product/zipartner'); setShowMobileMenu(false) }}
                className="px-3 py-2 text-sm text-green-400 text-left">Earn 💼</button>
              <button onClick={() => { navigate('/login'); setShowMobileMenu(false) }}
                className="mt-2 px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-xl text-center">
                Login / Sign Up
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-6 pb-4 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1 {...fd(0)} className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight mb-2">
            <span className="text-slate-300">India's All-in-One Business Suite —</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400">
              One Platform, Every Tool.
            </span>
          </motion.h1>

          <motion.div {...fd(0.1)} className="flex flex-wrap justify-center gap-2 mt-3">
            {[
              { icon: '✨', value: '19+', label: 'Products' },
              { icon: '🆓', value: 'Free', label: 'To Start' },
              { icon: '🇮🇳', value: '100%', label: 'Made in India' },
              { icon: '🔒', value: '99.9%', label: 'Uptime' },
            ].map(({ icon, value, label }, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">
                <span className="text-xs">{icon}</span>
                <span className="text-xs font-bold text-white">{value}</span>
                <span className="text-[11px] text-slate-500">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Product Grid + Detail Panel ── */}
      <section className="px-4 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div key="grid"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}>

                <motion.p {...fd(0.05)} className="text-center text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-4">
                  Explore Products
                </motion.p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="group cursor-pointer relative"
                      onClick={() => setSelected(product.id)}
                      whileHover={{ y: -5 }}
                    >
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10"
                        style={{ background: `radial-gradient(circle at 50% 60%, ${product.glow}, transparent 70%)` }}
                      />
                      <div
                        className="relative bg-white/[0.04] backdrop-blur-lg border border-white/[0.07] group-hover:bg-white/[0.07] rounded-2xl p-5 h-full flex flex-col transition-all duration-300"
                        onMouseEnter={e => (e.currentTarget.style.borderColor = product.glowBorder)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                      >
                        {product.badge && (
                          <div className="absolute top-3 right-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${product.color} text-white`}>
                              {product.badge}
                            </span>
                          </div>
                        )}

                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                          <ProductIcon id={product.id} size={28} />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <h3 className="text-base font-bold text-white">{product.name}</h3>
                          {product.id !== 'zipawn' && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400 ring-1 ring-inset ring-amber-500/25">Beta</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2 leading-snug">{product.tagline}</p>

                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          {product.features.slice(0, 2).map(f => (
                            <span key={f} className="text-[9px] text-slate-400 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: product.themeColor }}>
                          <span>Explore</span>
                          <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* ── Product Detail Panel (intermediate page) ── */
              <motion.div key="detail"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.35 }}>

                <button onClick={() => setSelected(null)}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-5 px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                  <ArrowLeft size={14} />Back to Products
                </button>

                {selectedProduct && (
                  <div className="relative overflow-hidden rounded-3xl border border-white/[0.09]"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(20px)' }}>

                    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-30 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${selectedProduct.glow.replace('0.22','0.5')}, transparent 70%)` }} />

                    <div className="relative z-10 grid lg:grid-cols-2 gap-0">
                      {/* Left: product info */}
                      <div className="p-8 lg:p-10">
                        <div className="flex items-center gap-5 mb-6">
                          <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${selectedProduct.color} flex items-center justify-center shadow-2xl`}>
                            <ProductIcon id={selectedProduct.id} size={50} />
                          </div>
                          <div>
                            <h2 className="text-3xl font-bold text-white">{selectedProduct.name}</h2>
                            <p className="text-sm mt-0.5" style={{ color: selectedProduct.themeColor }}>{selectedProduct.tagline}</p>
                          </div>
                        </div>

                        <p className="text-slate-300 text-base leading-relaxed mb-8">{selectedProduct.desc}</p>

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Key Features</p>
                        <div className="grid grid-cols-2 gap-3 mb-8">
                          {selectedProduct.features.map(f => (
                            <div key={f} className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
                              <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${selectedProduct.color}`} />
                              <span className="text-sm text-slate-300">{f}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <motion.button
                            onClick={() => navigate(selectedProduct.route)}
                            className={`flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r ${selectedProduct.color} text-white font-bold text-sm rounded-xl`}
                            whileHover={{ scale: 1.03, boxShadow: `0 0 25px ${selectedProduct.glow}` }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Learn More <ArrowRight size={16} />
                          </motion.button>
                          <button onClick={() => navigate('/login')}
                            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-semibold text-sm rounded-xl transition-all">
                            Login
                          </button>
                          <button onClick={() => setSelected(null)}
                            className="hidden sm:flex items-center justify-center px-4 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white rounded-xl transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Right: auth prompt */}
                      <div className="hidden md:flex items-center justify-center p-8 border-l border-white/[0.06]">
                        <AuthPromptCard product={selectedProduct} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Trust pillars ── */}
      <section className="px-4 py-16 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-8">Why businesses choose Ziort</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_PILLARS.map((p, i) => (
              <motion.div key={p.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:bg-white/[0.05] transition-colors">
                <span className="text-2xl shrink-0 mt-0.5">{p.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{p.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-4 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35"/>
                <circle cx="20" cy="20" r="11" fill="#6d6ade" opacity="0.9"/>
                <circle cx="20" cy="20" r="5" fill="#38bdf8"/>
                <circle cx="20" cy="2" r="3" fill="#f59e0b"/>
              </svg>
              <span className="text-slate-400 font-semibold">Ziort</span>
            </div>
            <span className="text-slate-800">·</span>
            <span>© {new Date().getFullYear()} Ziort. All rights reserved.</span>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Login', '/login']].map(([l, h]) => (
              <a key={l} href={h} className="hover:text-slate-300 transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="text-[11px]">India's Business OS 🇮🇳</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
