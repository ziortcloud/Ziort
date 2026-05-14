// ZiPulse — Business Relationship OS validators
import { z } from 'zod'

export const CreateContactSchema = z.object({
  name:                 z.string().min(2).max(120),
  mobile:               z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile number'),
  company_name:         z.string().max(120).optional(),
  designation:          z.string().max(80).optional(),
  email:                z.string().email().optional(),
  address:              z.string().max(255).optional(),
  city:                 z.string().max(80).optional(),
  source:               z.enum(['manual','walk_in','zimatch','zipawn','zifleet','zifood',
                                 'zicare','ziledger','zipartner','referral','cold_call','inbound'])
                         .optional().default('manual'),
  source_ref_code:      z.string().max(100).optional(),
  referred_by_contact:  z.string().uuid().optional(),
  next_followup_at:     z.string().datetime().optional(),
  next_followup_channel: z.enum(['call','whatsapp','visit','email','meeting']).optional(),
  branch_id:            z.string().uuid().optional(),
  assigned_to:          z.string().uuid().optional(),
})

export const UpdateContactSchema = z.object({
  name:                  z.string().min(2).max(120).optional(),
  company_name:          z.string().max(120).optional().nullable(),
  designation:           z.string().max(80).optional().nullable(),
  email:                 z.string().email().optional().nullable(),
  address:               z.string().max(255).optional().nullable(),
  city:                  z.string().max(80).optional().nullable(),
  assigned_to:           z.string().uuid().optional().nullable(),
  next_followup_at:      z.string().datetime().optional().nullable(),
  next_followup_channel: z.enum(['call','whatsapp','visit','email','meeting']).optional().nullable(),
  is_archived:           z.boolean().optional(),
  archive_reason:        z.string().max(255).optional().nullable(),
})

export const CreateThreadSchema = z.object({
  entry_type:  z.enum(['note','voice_note','file','photo','promise','meeting',
                        'quote_sent','follow_up','status_change','payment','system']),
  content:     z.string().max(5000).optional(),
  voice_url:   z.string().url().optional(),
  file_url:    z.string().url().optional(),
  file_name:   z.string().max(255).optional(),
  file_type:   z.enum(['pdf','image','doc','audio']).optional(),
  is_private:  z.boolean().optional().default(false),
  enquiry_id:  z.string().uuid().optional(),
  meeting_id:  z.string().uuid().optional(),
})

export const CreatePromiseSchema = z.object({
  promise_type: z.enum(['send_quote','call_back','visit','confirm',
                         'deliver','introduce','payment','send_document','custom']),
  direction:    z.enum(['owner_to_contact','contact_to_owner']).default('owner_to_contact'),
  description:  z.string().min(5).max(500),
  due_at:       z.string().datetime(),
  reminder_at:  z.string().datetime().optional(),
  enquiry_id:   z.string().uuid().optional(),
})

export const FulfillPromiseSchema = z.object({
  fulfillment_note: z.string().max(500).optional(),
})

export const BreakPromiseSchema = z.object({
  broken_reason: z.string().max(500).optional(),
})

export const CreateFollowupSchema = z.object({
  channel:      z.enum(['call','whatsapp','visit','email','meeting']),
  scheduled_at: z.string().datetime(),
  reminder_at:  z.string().datetime().optional(),
  agenda:       z.string().max(500).optional(),
  enquiry_id:   z.string().uuid().optional(),
  assigned_to:  z.string().uuid().optional(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_type: z.enum(['daily','weekly','monthly','quarterly']).optional(),
})

export const CompleteFollowupSchema = z.object({
  outcome:         z.enum(['spoke_positive','spoke_neutral','spoke_negative','no_answer',
                            'rescheduled','meeting_scheduled','deal_progressed','deal_closed','deal_lost']),
  outcome_notes:   z.string().max(500).optional(),
  next_followup_at: z.string().datetime().optional(),
})

export const CreateEnquirySchema = z.object({
  title:            z.string().min(3).max(200),
  description:      z.string().max(2000).optional(),
  category:         z.string().max(80).optional(),
  product_interest: z.string().max(80).optional(),
  value:            z.number().min(0).optional().default(0),
  currency:         z.string().length(3).optional().default('INR'),
  probability:      z.number().int().min(0).max(100).optional().default(50),
  source:           z.string().max(50).optional(),
  expected_close:   z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  assigned_to:      z.string().uuid().optional(),
})

export const UpdateEnquiryStageSchema = z.object({
  stage: z.enum(['new','contacted','interested','quote_sent','negotiating',
                  'decision_pending','won','lost','on_hold']),
  note:       z.string().max(500).optional(),
  won_value:  z.number().min(0).optional(),
  lost_reason: z.string().max(255).optional(),
  lost_to:    z.string().max(120).optional(),
})

export const CreateMeetingSchema = z.object({
  title:          z.string().min(3).max(200),
  scheduled_at:   z.string().datetime(),
  duration_mins:  z.number().int().min(5).max(480).optional().default(30),
  location:       z.string().max(255).optional(),
  location_url:   z.string().url().optional(),
  meeting_url:    z.string().url().optional(),
  agenda:         z.string().max(1000).optional(),
  pre_notes:      z.string().max(1000).optional(),
  enquiry_id:     z.string().uuid().optional(),
})

export const CompleteMeetingSchema = z.object({
  outcome:      z.string().max(2000),
  action_items: z.array(z.object({
    description: z.string(),
    assigned_to: z.string().uuid().optional(),
    due_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  })).optional().default([]),
  next_step:    z.string().max(500).optional(),
})

export const CreateInboxItemSchema = z.object({
  content_type: z.enum(['note','voice','photo','file','link','system']).default('note'),
  content:      z.string().max(2000).optional(),
  media_url:    z.string().url().optional(),
})

export const ConvertInboxSchema = z.object({
  converted_to:  z.enum(['contact','enquiry','followup','note','archived']),
  contact_id:    z.string().uuid().optional(),
  enquiry_id:    z.string().uuid().optional(),
})

export type CreateContactInput  = z.infer<typeof CreateContactSchema>
export type CreateThreadInput   = z.infer<typeof CreateThreadSchema>
export type CreatePromiseInput  = z.infer<typeof CreatePromiseSchema>
export type CreateFollowupInput = z.infer<typeof CreateFollowupSchema>
export type CreateEnquiryInput  = z.infer<typeof CreateEnquirySchema>
export type CreateMeetingInput  = z.infer<typeof CreateMeetingSchema>
