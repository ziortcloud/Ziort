import { z } from 'zod'

export const CreatePatientSchema = z.object({
  full_name:                    z.string().min(2).max(120),
  mobile:                       z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number'),
  branch_id:                    z.string().uuid(),
  date_of_birth:                z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  gender:                       z.enum(['male','female','other','prefer_not_to_say']).optional(),
  email:                        z.string().email().optional(),
  blood_group:                  z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  allergies:                    z.array(z.string()).optional(),
  address:                      z.string().max(255).optional(),
  city:                         z.string().max(80).optional(),
  state:                        z.string().max(80).optional(),
  emergency_contact_name:       z.string().max(120).optional(),
  emergency_contact_mobile:     z.string().regex(/^\d{10}$/).optional(),
})

export const CreateAppointmentSchema = z.object({
  patient_id:       z.string().uuid(),
  doctor_id:        z.string().uuid(),
  branch_id:        z.string().uuid(),
  appointment_type: z.enum(['consultation','follow_up','procedure','test','emergency']),
  scheduled_at:     z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(480).optional().default(30),
  chief_complaint:  z.string().max(500).optional(),
  fee_paise:        z.number().int().min(0),
})

export const CompleteAppointmentSchema = z.object({
  diagnosis:      z.string().max(1000).optional(),
  prescription:   z.string().max(2000).optional(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  paid_paise:     z.number().int().min(0),
})

export const CreateCareEnquirySchema = z.object({
  full_name:    z.string().min(2).max(120),
  mobile:       z.string().regex(/^\d{10}$/),
  enquiry_text: z.string().min(5).max(1000),
})

export type CreatePatientInput     = z.infer<typeof CreatePatientSchema>
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type CreateCareEnquiryInput = z.infer<typeof CreateCareEnquirySchema>
