// ============================================================
// Product-level shared types
// ============================================================

// ── ZiPawn ──────────────────────────────────────────────────

export interface ZpnSchemeSummary {
  id: string
  schemeCode: string
  schemeName: string
  interestRatePm: number
  interestBasis: 'daily' | 'monthly'
  ltvGold916: number
  ltvGold999: number
  ltvSilver: number
  minLoanPaise: number
  maxLoanPaise: number
  penaltyEnabled: boolean
  isActive: boolean
}

export interface ZpnLoanSummary {
  id: string
  loanCode: string
  principalPaise: number
  interestRatePm: number
  disbursedAt: string
  closureDate?: string
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'AUCTIONED' | 'MIGRATED'
  contactName: string
  schemeCode: string
  isMigrated: boolean
}

export interface ZpnInterestCalc {
  principalPaise: number
  interestRatePm: number
  interestBasis: 'daily' | 'monthly'
  fromDate: string
  toDate: string
  days: number
  interestPaise: number
  penaltyPaise: number
  totalDuePaise: number
}

// ── ZiFleet ──────────────────────────────────────────────────

export interface ZflVehicleSummary {
  id: string
  vehicleCode: string
  registrationNo: string
  make?: string
  model?: string
  vehicleType?: string
  status: string
}

// ── ZiLoad ───────────────────────────────────────────────────

export interface ZldLoadSummary {
  id: string
  loadCode: string
  fromCity: string
  toCity: string
  goodsType?: string
  pickupDate: string
  status: string
  budgetPaise?: number
}

// ── ZiPulse ──────────────────────────────────────────────────

export interface ZpulseApptSummary {
  id: string
  apptCode: string
  patientName: string
  doctorName?: string
  scheduledAt: string
  status: string
  pulseScore?: number
}

// ── ZiNeed ───────────────────────────────────────────────────

export interface ZndRequirementSummary {
  id: string
  reqCode: string
  title: string
  category?: string
  budgetPaise?: number
  deadline?: string
  status: string
}

// ── ZiChit ───────────────────────────────────────────────────

export interface ZchtFundSummary {
  id: string
  fundCode: string
  fundName: string
  monthlyPaise: number
  totalMembers: number
  tenureMonths: number
  currentMonth: number
  status: string
}
