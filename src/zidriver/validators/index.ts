// ZiDriver — Zod validators for all API operations
import { z } from 'zod'

const LICENSE_TYPES     = ['LMV','HMV','HTV','PSV','TRANSPORT'] as const
const VEHICLE_TYPES     = ['LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER'] as const
const DOC_TYPES         = ['LICENSE','FITNESS_CERT','NATIONAL_PERMIT','STATE_PERMIT',
                            'AADHAAR','PAN','INSURANCE','POLLUTION_CERT','BADGE','OTHER'] as const
const ENGAGEMENT_TYPES  = ['FLEET','LOAD','ADHOC'] as const
const RATE_TYPES        = ['PER_DAY','PER_TRIP','PER_KM'] as const

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────
export const CreateDriverProfileSchema = z.object({
  full_name:         z.string().min(2).max(120),
  mobile:            z.string().regex(/^\d{10}$/),    // hashed before storage
  photo_url:         z.string().url().optional(),
  dob:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender:            z.enum(['male','female','other']).optional(),
  home_city:         z.string().min(2).max(100),
  home_state:        z.string().min(2).max(100),
  current_city:      z.string().max(100).optional(),
  experience_years:  z.number().int().min(0).max(60).default(0),
  vehicle_types:     z.array(z.enum(VEHICLE_TYPES)).min(1),
  preferred_routes:  z.string().max(300).optional(),
  languages:         z.array(z.string().max(50)).default(['Hindi']),
  about:             z.string().max(500).optional(),
  license_number:    z.string().min(5).max(30),
  license_type:      z.enum(LICENSE_TYPES),
  license_expiry:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const UpdateDriverProfileSchema = CreateDriverProfileSchema
  .omit({ mobile: true, license_number: true, license_type: true })
  .extend({
    availability_status: z.enum(['AVAILABLE','BUSY','INACTIVE']).optional(),
  })
  .partial()

// ─────────────────────────────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────────────────────────────
export const PostAvailabilitySchema = z.object({
  available_from:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available_until:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from_city:         z.string().min(2).max(100),
  to_city:           z.string().max(100).optional(),
  vehicle_type_pref: z.enum(VEHICLE_TYPES).optional(),
  rate_paise:        z.number().int().positive().optional(),
  rate_type:         z.enum(RATE_TYPES).default('PER_DAY'),
  notes:             z.string().max(300).optional(),
})

export const UpdateAvailabilitySchema = PostAvailabilitySchema.partial().extend({
  status: z.enum(['POSTED','EXPIRED','WITHDRAWN']).optional(),
})

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────
export const AddDocumentSchema = z.object({
  doc_type:    z.enum(DOC_TYPES),
  doc_number:  z.string().max(60).optional(),
  doc_url:     z.string().url(),
  issued_at:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().max(300).optional(),
})

export const UpdateDocumentSchema = AddDocumentSchema.partial()

// ─────────────────────────────────────────────────────────────
// ENGAGEMENTS (hire offers)
// ─────────────────────────────────────────────────────────────
export const MakeHireOfferSchema = z.object({
  driver_entity_id:  z.string().uuid(),
  engagement_type:   z.enum(ENGAGEMENT_TYPES).default('ADHOC'),
  zft_trip_id:       z.string().uuid().optional(),
  zld_booking_id:    z.string().uuid().optional(),
  title:             z.string().min(3).max(200),
  description:       z.string().max(500).optional(),
  from_city:         z.string().min(2).max(100),
  to_city:           z.string().max(100).optional(),
  start_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vehicle_type:      z.enum(VEHICLE_TYPES).optional(),
  offered_rate_paise: z.number().int().positive(),
  rate_type:         z.enum(RATE_TYPES).default('PER_TRIP'),
  advance_paise:     z.number().int().nonnegative().default(0),
  offer_note:        z.string().max(300).optional(),
})

export const RespondEngagementSchema = z.object({
  action:        z.enum(['accept','reject']),
  accept_note:   z.string().max(300).optional(),
  reject_reason: z.string().max(300).optional(),
})

export const UpdateEngagementSchema = z.object({
  action:       z.enum(['start','complete','cancel']),
  actual_km:    z.number().int().nonnegative().optional(),
  cancel_reason: z.string().max(300).optional(),
})

// ─────────────────────────────────────────────────────────────
// RATINGS
// ─────────────────────────────────────────────────────────────
export const SubmitDriverRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type CreateDriverProfileInput = z.infer<typeof CreateDriverProfileSchema>
export type MakeHireOfferInput       = z.infer<typeof MakeHireOfferSchema>
export type PostAvailabilityInput    = z.infer<typeof PostAvailabilitySchema>
export type AddDocumentInput         = z.infer<typeof AddDocumentSchema>
