export type ProductCode =
  | 'ZPN'   // ZiPawn
  | 'ZFLT'  // ZiFleet
  | 'ZLD'   // ZiLoad
  | 'ZDR'   // ZiDriver
  | 'ZPLS'  // ZiPulse
  | 'ZND'   // ZiNeed
  | 'ZCR'   // ZiCare
  | 'ZCHT'  // ZiChit
  | 'ZFD'   // ZiFood
  | 'ZSHP'  // ZiShop
  | 'ZNVC'  // ZiInvoice
  | 'ZQT'   // ZiQuote
  | 'ZRCP'  // ZiReceipt
  | 'ZLDG'  // ZiLedger
  | 'ZPST'  // ZiPost
  | 'ZSCN'  // ZiScan
  | 'ZYLD'  // ZiYield
  | 'ZBLD'  // ZiBuild
  | 'ZPRTN' // ZiPartner
  | 'ZCLC'  // ZiCalc

export type ProductCategory =
  | 'FINANCE'
  | 'LOGISTICS'
  | 'HEALTH'
  | 'TRADE'
  | 'HOSPITALITY'
  | 'RETAIL'
  | 'DOCS'
  | 'AGRI'
  | 'CONSTRUCTION'
  | 'PLATFORM'

export interface Product {
  code: ProductCode
  name: string
  tagline: string
  category: ProductCategory
  subscriptionPrefix: string  // prefix for zi_code_sequences (e.g. 'ZPN')
  contactPrefix: string       // CST / SUP etc used for biz_contacts
  icon: string                // lucide icon name
  color: string               // tailwind color class
  trialDays: number
  isLive: boolean             // fully implemented
}

export const PRODUCTS: Record<ProductCode, Product> = {
  ZPN: {
    code: 'ZPN',
    name: 'ZiPawn',
    tagline: 'Gold pawn & pledge loan management',
    category: 'FINANCE',
    subscriptionPrefix: 'ZPN',
    contactPrefix: 'CST',
    icon: 'gem',
    color: 'amber',
    trialDays: 30,
    isLive: true,
  },
  ZFLT: {
    code: 'ZFLT',
    name: 'ZiFleet',
    tagline: 'Vehicle & trip management',
    category: 'LOGISTICS',
    subscriptionPrefix: 'ZFLT',
    contactPrefix: 'CST',
    icon: 'truck',
    color: 'blue',
    trialDays: 30,
    isLive: true,
  },
  ZLD: {
    code: 'ZLD',
    name: 'ZiLoad',
    tagline: 'Logistics loads marketplace',
    category: 'LOGISTICS',
    subscriptionPrefix: 'ZLD',
    contactPrefix: 'CST',
    icon: 'package',
    color: 'orange',
    trialDays: 30,
    isLive: true,
  },
  ZDR: {
    code: 'ZDR',
    name: 'ZiDriver',
    tagline: 'Driver profiles & engagement',
    category: 'LOGISTICS',
    subscriptionPrefix: 'ZDR',
    contactPrefix: 'CST',
    icon: 'user-round',
    color: 'sky',
    trialDays: 30,
    isLive: true,
  },
  ZPLS: {
    code: 'ZPLS',
    name: 'ZiPulse',
    tagline: 'Healthcare appointment scheduling',
    category: 'HEALTH',
    subscriptionPrefix: 'ZPLS',
    contactPrefix: 'CST',
    icon: 'heart-pulse',
    color: 'rose',
    trialDays: 30,
    isLive: true,
  },
  ZND: {
    code: 'ZND',
    name: 'ZiNeed',
    tagline: 'B2B requirements & deal marketplace',
    category: 'TRADE',
    subscriptionPrefix: 'ZND',
    contactPrefix: 'SUP',
    icon: 'handshake',
    color: 'violet',
    trialDays: 30,
    isLive: true,
  },
  ZCR: {
    code: 'ZCR',
    name: 'ZiCare',
    tagline: 'Clinic & patient management',
    category: 'HEALTH',
    subscriptionPrefix: 'ZCR',
    contactPrefix: 'CST',
    icon: 'stethoscope',
    color: 'emerald',
    trialDays: 30,
    isLive: false,
  },
  ZCHT: {
    code: 'ZCHT',
    name: 'ZiChit',
    tagline: 'Chit fund management',
    category: 'FINANCE',
    subscriptionPrefix: 'ZCHT',
    contactPrefix: 'CST',
    icon: 'coins',
    color: 'yellow',
    trialDays: 30,
    isLive: false,
  },
  ZFD: {
    code: 'ZFD',
    name: 'ZiFood',
    tagline: 'Restaurant & table ordering',
    category: 'HOSPITALITY',
    subscriptionPrefix: 'ZFD',
    contactPrefix: 'CST',
    icon: 'utensils',
    color: 'red',
    trialDays: 30,
    isLive: false,
  },
  ZSHP: {
    code: 'ZSHP',
    name: 'ZiShop',
    tagline: 'Retail POS & inventory',
    category: 'RETAIL',
    subscriptionPrefix: 'ZSHP',
    contactPrefix: 'CST',
    icon: 'store',
    color: 'teal',
    trialDays: 30,
    isLive: false,
  },
  ZNVC: {
    code: 'ZNVC',
    name: 'ZiInvoice',
    tagline: 'GST invoicing & billing',
    category: 'DOCS',
    subscriptionPrefix: 'ZNVC',
    contactPrefix: 'CST',
    icon: 'file-text',
    color: 'indigo',
    trialDays: 30,
    isLive: false,
  },
  ZQT: {
    code: 'ZQT',
    name: 'ZiQuote',
    tagline: 'Quotation & proposal management',
    category: 'DOCS',
    subscriptionPrefix: 'ZQT',
    contactPrefix: 'CST',
    icon: 'file-pen',
    color: 'cyan',
    trialDays: 30,
    isLive: false,
  },
  ZRCP: {
    code: 'ZRCP',
    name: 'ZiReceipt',
    tagline: 'Digital payment receipts',
    category: 'DOCS',
    subscriptionPrefix: 'ZRCP',
    contactPrefix: 'CST',
    icon: 'receipt',
    color: 'lime',
    trialDays: 30,
    isLive: false,
  },
  ZLDG: {
    code: 'ZLDG',
    name: 'ZiLedger',
    tagline: 'Double-entry accounting',
    category: 'FINANCE',
    subscriptionPrefix: 'ZLDG',
    contactPrefix: 'CST',
    icon: 'book-open',
    color: 'slate',
    trialDays: 30,
    isLive: false,
  },
  ZPST: {
    code: 'ZPST',
    name: 'ZiPost',
    tagline: 'Hyperlocal ad & promotion platform',
    category: 'TRADE',
    subscriptionPrefix: 'ZPST',
    contactPrefix: 'CST',
    icon: 'megaphone',
    color: 'pink',
    trialDays: 30,
    isLive: false,
  },
  ZSCN: {
    code: 'ZSCN',
    name: 'ZiScan',
    tagline: 'Document scanning & OCR',
    category: 'DOCS',
    subscriptionPrefix: 'ZSCN',
    contactPrefix: 'CST',
    icon: 'scan',
    color: 'gray',
    trialDays: 30,
    isLive: false,
  },
  ZYLD: {
    code: 'ZYLD',
    name: 'ZiYield',
    tagline: 'Agriculture produce tracking',
    category: 'AGRI',
    subscriptionPrefix: 'ZYLD',
    contactPrefix: 'CST',
    icon: 'wheat',
    color: 'green',
    trialDays: 30,
    isLive: false,
  },
  ZBLD: {
    code: 'ZBLD',
    name: 'ZiBuild',
    tagline: 'Construction project management',
    category: 'CONSTRUCTION',
    subscriptionPrefix: 'ZBLD',
    contactPrefix: 'CST',
    icon: 'hard-hat',
    color: 'stone',
    trialDays: 30,
    isLive: false,
  },
  ZPRTN: {
    code: 'ZPRTN',
    name: 'ZiPartner',
    tagline: 'Partnership & revenue tracking',
    category: 'PLATFORM',
    subscriptionPrefix: 'ZPRTN',
    contactPrefix: 'PTR',
    icon: 'users',
    color: 'purple',
    trialDays: 30,
    isLive: false,
  },
  ZCLC: {
    code: 'ZCLC',
    name: 'ZiCalc',
    tagline: 'Business calculators',
    category: 'PLATFORM',
    subscriptionPrefix: 'ZCLC',
    contactPrefix: 'CST',
    icon: 'calculator',
    color: 'neutral',
    trialDays: 30,
    isLive: false,
  },
}

export const LIVE_PRODUCTS = Object.values(PRODUCTS).filter(p => p.isLive)
export const ALL_PRODUCTS  = Object.values(PRODUCTS)
