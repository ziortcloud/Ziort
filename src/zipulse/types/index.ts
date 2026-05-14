// ZiPulse — Healthcare CRM & Appointment Management
// Product code: ZPLS | Subscription prefix: ZPLSA01
// Transaction codes: THR26A01 (therapy/visit), PRM26A01 (promo), ENQ26A01 (enquiry),
//                    FUP26A01 (follow-up), MTG26A01 (meeting)

export type PatientStatus = 'active' | 'inactive' | 'blacklisted'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'test' | 'emergency'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface ZplsPatient {
  id: string
  zi_code: string           // CST prefix → CSTA01
  ref_code: string          // ZEA01ZPLSA01CSTA01
  entity_id: string
  subscription_id: string
  branch_id: string
  full_name: string
  date_of_birth?: string
  gender?: Gender
  mobile_hash: string
  mobile_last4: string
  email?: string
  blood_group?: string
  allergies?: string[]
  address?: string
  city?: string
  state?: string
  emergency_contact_name?: string
  emergency_contact_mobile_last4?: string
  status: PatientStatus
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ZplsDoctor {
  id: string
  zi_code: string           // internal, AGT prefix
  ref_code: string
  entity_id: string
  subscription_id: string
  individual_id?: string    // if they are a Ziort user
  full_name: string
  specialization: string
  qualification: string
  registration_number?: string
  consultation_fee_paise: number
  is_active: boolean
  created_at: string
}

export interface ZplsAppointment {
  id: string
  zi_code: string           // THR prefix → THR26A01
  ref_code: string
  entity_id: string
  subscription_id: string
  branch_id: string
  patient_id: string
  doctor_id: string
  appointment_type: AppointmentType
  scheduled_at: string      // ISO datetime
  duration_minutes: number
  status: AppointmentStatus
  chief_complaint?: string
  diagnosis?: string
  prescription?: string
  follow_up_date?: string
  fee_paise: number
  paid_paise: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ZplsEnquiry {
  id: string
  zi_code: string           // ENQ prefix → ENQ26A01
  ref_code: string
  entity_id: string
  subscription_id: string
  full_name: string
  mobile_last4: string
  enquiry_text: string
  status: 'open' | 'followed_up' | 'converted' | 'closed'
  created_at: string
}

export interface CreatePatientInput {
  full_name: string
  mobile: string
  date_of_birth?: string
  gender?: Gender
  email?: string
  blood_group?: string
  allergies?: string[]
  address?: string
  city?: string
  state?: string
  emergency_contact_name?: string
  emergency_contact_mobile?: string
  branch_id: string
}

export interface CreateAppointmentInput {
  patient_id: string
  doctor_id: string
  branch_id: string
  appointment_type: AppointmentType
  scheduled_at: string
  duration_minutes?: number
  chief_complaint?: string
  fee_paise: number
}
