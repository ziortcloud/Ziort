// ZiNeed — B2B Procurement & Requirement Matching
// Product code: ZND | Subscription prefix: ZNDA01
// Transaction codes: REQ26A01 (requirement), PRO26A01 (proposal), DL26A01 (deal/contract),
//                    ESC26A01 (escalation), COM26A01 (completion), RTG26A01 (rating), DSP26A01 (dispute)

export type RequirementStatus =
  | 'draft'
  | 'published'
  | 'matching'
  | 'proposals_received'
  | 'in_negotiation'
  | 'deal_closed'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type ProposalStatus =
  | 'submitted'
  | 'shortlisted'
  | 'rejected'
  | 'accepted'
  | 'withdrawn'

export type DealStatus =
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type ContactType = 'customer' | 'supplier' | 'vendor' | 'agent' | 'partner'

export interface ZndRequirement {
  id: string
  zi_code: string           // REQ prefix → REQ26A01
  ref_code: string          // ZEA01ZNDA01REQ26A01
  entity_id: string
  subscription_id: string
  posted_by: string         // individual_id
  title: string
  description: string
  category: string
  sub_category?: string
  quantity?: number
  unit?: string
  budget_min_paise?: number
  budget_max_paise?: number
  location_city?: string
  location_state?: string
  delivery_date?: string
  is_urgent: boolean
  is_anonymous: boolean
  status: RequirementStatus
  expires_at: string
  proposal_count: number
  created_at: string
  updated_at: string
}

export interface ZndProposal {
  id: string
  zi_code: string           // PRO prefix → PRO26A01
  ref_code: string
  entity_id: string         // proposer's entity
  subscription_id: string
  requirement_id: string
  proposed_by: string       // individual_id
  price_paise: number
  delivery_days: number
  notes?: string
  status: ProposalStatus
  created_at: string
  updated_at: string
}

export interface ZndDeal {
  id: string
  zi_code: string           // DL prefix → DL26A01
  ref_code: string
  buyer_entity_id: string
  seller_entity_id: string
  requirement_id: string
  proposal_id: string
  agreed_price_paise: number
  agreed_delivery_date: string
  status: DealStatus
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface ZndRating {
  id: string
  zi_code: string           // RTG prefix → RTG26A01
  ref_code: string
  deal_id: string
  rated_by: string
  rated_entity_id: string
  score: number             // 1–5
  review?: string
  created_at: string
}

export interface CreateRequirementInput {
  title: string
  description: string
  category: string
  sub_category?: string
  quantity?: number
  unit?: string
  budget_min_paise?: number
  budget_max_paise?: number
  location_city?: string
  location_state?: string
  delivery_date?: string
  is_urgent?: boolean
  is_anonymous?: boolean
  expires_days?: number     // default 30
}

export interface CreateProposalInput {
  requirement_id: string
  price_paise: number
  delivery_days: number
  notes?: string
}
