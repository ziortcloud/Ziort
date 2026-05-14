// ZiLoad — Zod validators for all API operations
import { z } from 'zod'

const VEHICLE_TYPES = ['LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER','ANY'] as const
const VEHICLE_TYPES_NO_ANY = ['LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER'] as const

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────
export const UpsertProfileSchema = z.object({
  role:           z.enum(['shipper','transporter','agency']),
  company_name:   z.string().min(2).max(120),
  gstin:          z.string().regex(/^[0-9A-Z]{15}$/).optional(),
  city:           z.string().max(80).optional(),
  state:          z.string().max(80).optional(),
  contact_name:   z.string().max(100).optional(),
  contact_mobile: z.string().regex(/^\d{10}$/).optional(),
  logo_url:       z.string().url().optional(),
})

// ─────────────────────────────────────────────────────────────
// LOADS
// ─────────────────────────────────────────────────────────────
export const PostLoadSchema = z.object({
  origin_city:          z.string().min(2).max(100),
  origin_address:       z.string().max(300).optional(),
  dest_city:            z.string().min(2).max(100),
  dest_address:         z.string().max(300).optional(),
  via_cities:           z.array(z.string().max(100)).default([]),
  pickup_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  required_by_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  material_type:        z.string().min(2).max(100),
  weight_tons:          z.number().positive().optional(),
  dimensions:           z.string().max(100).optional(),
  declared_value_paise: z.number().int().nonnegative().default(0),
  special_handling:     z.string().max(300).optional(),
  vehicle_type:         z.enum(VEHICLE_TYPES).default('ANY'),
  min_capacity_tons:    z.number().positive().optional(),
  budget_paise:         z.number().int().positive().optional(),
  payment_terms:        z.enum(['ADVANCE','COD','NET_7','NET_15','NET_30']).default('NET_30'),
  po_reference:         z.string().max(80).optional(),
  expires_hours:        z.number().int().min(24).max(168).default(168), // 1–7 days
})

export const UpdateLoadSchema = z.object({
  origin_address:    z.string().max(300).optional(),
  dest_address:      z.string().max(300).optional(),
  pickup_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  required_by_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  weight_tons:       z.number().positive().optional(),
  declared_value_paise: z.number().int().nonnegative().optional(),
  special_handling:  z.string().max(300).optional(),
  budget_paise:      z.number().int().positive().optional(),
  payment_terms:     z.enum(['ADVANCE','COD','NET_7','NET_15','NET_30']).optional(),
  po_reference:      z.string().max(80).optional(),
})

// ─────────────────────────────────────────────────────────────
// TRUCK POSTINGS
// ─────────────────────────────────────────────────────────────
export const PostTruckSchema = z.object({
  vehicle_type:    z.enum(VEHICLE_TYPES_NO_ANY),
  capacity_tons:   z.number().positive().optional(),
  reg_number:      z.string().max(20).optional(),
  current_city:    z.string().min(2).max(100),
  available_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  available_until: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  dest_preference: z.string().max(200).optional(),
  rate_paise:      z.number().int().positive().optional(),
  rate_type:       z.enum(['PER_TRIP','PER_TON','PER_KM']).default('PER_TRIP'),
  zft_vehicle_id:  z.string().uuid().optional(),
})

export const UpdateTruckSchema = PostTruckSchema.partial().extend({
  status: z.enum(['AVAILABLE','UNAVAILABLE']).optional(),
})

// ─────────────────────────────────────────────────────────────
// BIDS
// ─────────────────────────────────────────────────────────────
export const PlaceBidSchema = z.object({
  amount_paise: z.number().int().positive(),
  truck_id:     z.string().uuid().optional(),
  note:         z.string().max(300).optional(),
})

export const RespondBidSchema = z.object({
  action: z.enum(['accept','reject']),
  note:   z.string().max(300).optional(),
})

// ─────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────
export const DirectBookSchema = z.object({
  transporter_entity_id: z.string().uuid(),
  truck_id:              z.string().uuid().optional(),
  freight_paise:         z.number().int().positive(),
  advance_paise:         z.number().int().nonnegative().default(0),
  payment_terms:         z.enum(['ADVANCE','COD','NET_7','NET_15','NET_30']).default('NET_30'),
  lr_number:             z.string().max(50).optional(),
  notes:                 z.string().max(500).optional(),
})

export const UpdateBookingStatusSchema = z.object({
  status:     z.enum(['LOADING','IN_TRANSIT','UNLOADING','DELIVERED','CLOSED','CANCELLED']),
  note:       z.string().max(300).optional(),
  lat:        z.number().optional(),
  lng:        z.number().optional(),
  actor_role: z.enum(['SHIPPER','TRANSPORTER','AGENCY','SYSTEM']).default('SHIPPER'),
  lr_url:     z.string().url().optional(),
  pod_url:    z.string().url().optional(),
})

export const VerifyOtpSchema = z.object({
  otp: z.string().length(6).regex(/^\d+$/),
})

// ─────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────
export const SendMessageSchema = z.object({
  body:           z.string().min(1).max(1000),
  attachment_url: z.string().url().optional(),
})

// ─────────────────────────────────────────────────────────────
// RATE CARDS
// ─────────────────────────────────────────────────────────────
export const CreateRateCardSchema = z.object({
  origin_city:     z.string().min(2).max(100),
  dest_city:       z.string().min(2).max(100),
  vehicle_type:    z.enum(VEHICLE_TYPES_NO_ANY),
  rate_per_ton:    z.number().int().positive(),
  min_weight_tons: z.number().positive().default(1),
  max_weight_tons: z.number().positive().optional(),
  effective_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  effective_to:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
})

// ─────────────────────────────────────────────────────────────
// RATINGS
// ─────────────────────────────────────────────────────────────
export const SubmitRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type PostLoadInput       = z.infer<typeof PostLoadSchema>
export type PostTruckInput      = z.infer<typeof PostTruckSchema>
export type PlaceBidInput       = z.infer<typeof PlaceBidSchema>
export type DirectBookInput     = z.infer<typeof DirectBookSchema>
export type CreateRateCardInput = z.infer<typeof CreateRateCardSchema>
