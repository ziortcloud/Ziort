// ZiFleet — Zod validators for all API operations
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────────────────────
export const CreateVehicleSchema = z.object({
  reg_number:       z.string().min(4).max(20).toUpperCase(),
  vehicle_type:     z.enum(['LCV','HCV','OPEN_BODY','CONTAINER','TANKER','TIPPER','REFRIGERATED','OTHER']).default('HCV'),
  make:             z.string().max(50).optional(),
  model:            z.string().max(50).optional(),
  manufacture_year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  capacity_tons:    z.number().positive().optional(),
  capacity_cbm:     z.number().positive().optional(),
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  fitness_expiry:   z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  permit_expiry:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  puc_expiry:       z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  rc_url:           z.string().url().optional(),
  insurance_url:    z.string().url().optional(),
  notes:            z.string().max(500).optional(),
})

export const UpdateVehicleSchema = CreateVehicleSchema.partial().extend({
  status:    z.enum(['AVAILABLE','MAINTENANCE','OFF_ROAD']).optional(), // ON_TRIP is system-managed
  is_active: z.boolean().optional(),
})

// ─────────────────────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────────────────────
export const CreateDriverSchema = z.object({
  full_name:       z.string().min(2).max(120),
  mobile:          z.string().regex(/^\d{10}$/, 'Enter 10-digit mobile'),
  aadhaar_last4:   z.string().length(4).optional(),
  license_no:      z.string().max(20).optional(),
  license_expiry:  z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  photo_url:       z.string().url().optional(),
  license_url:     z.string().url().optional(),
  emergency_name:  z.string().max(100).optional(),
  emergency_mobile: z.string().regex(/^\d{10}$/).optional(),
  notes:           z.string().max(500).optional(),
})

export const UpdateDriverSchema = CreateDriverSchema.partial()
  .omit({ mobile: true })
  .extend({
    status:    z.enum(['AVAILABLE','ON_LEAVE','INACTIVE']).optional(),
    is_active: z.boolean().optional(),
  })

// ─────────────────────────────────────────────────────────────
// TRIPS
// ─────────────────────────────────────────────────────────────
export const CreateTripSchema = z.object({
  vehicle_id:    z.string().uuid().optional(),
  driver_id:     z.string().uuid().optional(),
  branch_id:     z.string().uuid().optional(),
  origin:        z.string().min(2).max(200),
  destination:   z.string().min(2).max(200),
  via_points:    z.array(z.string().max(200)).default([]),
  client_name:   z.string().max(120).optional(),
  client_phone:  z.string().regex(/^\d{10}$/).optional(),
  client_ref:    z.string().max(80).optional(),
  cargo_type:    z.string().max(80).optional(),
  cargo_desc:    z.string().max(300).optional(),
  weight_tons:   z.number().positive().optional(),
  freight_paise: z.number().int().nonnegative().default(0),
  advance_paise: z.number().int().nonnegative().default(0),
  start_odo:     z.number().int().nonnegative().optional(),
  planned_start: z.string().datetime().optional(),
  lr_number:     z.string().max(50).optional(),
  notes:         z.string().max(500).optional(),
  source_type:   z.enum(['MANUAL','ZILOAD','ZIBUILD']).default('MANUAL'),
  source_id:     z.string().uuid().optional(),
})

export const UpdateTripSchema = z.object({
  vehicle_id:    z.string().uuid().optional().nullable(),
  driver_id:     z.string().uuid().optional().nullable(),
  client_name:   z.string().max(120).optional(),
  client_phone:  z.string().regex(/^\d{10}$/).optional(),
  client_ref:    z.string().max(80).optional(),
  cargo_type:    z.string().max(80).optional(),
  cargo_desc:    z.string().max(300).optional(),
  weight_tons:   z.number().positive().optional(),
  freight_paise: z.number().int().nonnegative().optional(),
  advance_paise: z.number().int().nonnegative().optional(),
  start_odo:     z.number().int().nonnegative().optional(),
  end_odo:       z.number().int().nonnegative().optional(),
  lr_number:     z.string().max(50).optional(),
  lr_url:        z.string().url().optional(),
  pod_url:       z.string().url().optional(),
  notes:         z.string().max(500).optional(),
})

export const UpdateTripStatusSchema = z.object({
  status:     z.enum(['LOADING','WAITING','IN_TRANSIT','UNLOADING','DELIVERED','CLOSED','CANCELLED']),
  note:       z.string().max(300).optional(),
  lat:        z.number().optional(),
  lng:        z.number().optional(),
  actor_role: z.enum(['OWNER','DRIVER','SYSTEM']).default('OWNER'),
  end_odo:    z.number().int().nonnegative().optional(),
})

// ─────────────────────────────────────────────────────────────
// FUEL LOGS
// ─────────────────────────────────────────────────────────────
export const LogFuelSchema = z.object({
  vehicle_id:   z.string().uuid(),
  trip_id:      z.string().uuid().optional(),
  litres:       z.number().positive(),
  rate_paise:   z.number().int().positive(),           // paise per litre
  amount_paise: z.number().int().positive(),
  odometer:     z.number().int().nonnegative().optional(),
  station:      z.string().max(100).optional(),
})

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────
export const LogExpenseSchema = z.object({
  trip_id:      z.string().uuid().optional(),
  vehicle_id:   z.string().uuid().optional(),
  category:     z.enum(['TOLL','TYRE_REPAIR','DRIVER_SALARY','FOOD','LOADING_LABOUR','POLICE','PARKING','BROKER_FEE','DETENTION','OTHER']),
  amount_paise: z.number().int().positive(),
  notes:        z.string().max(300).optional(),
  receipt_url:  z.string().url().optional(),
})

// ─────────────────────────────────────────────────────────────
// TRIP PAYMENTS
// ─────────────────────────────────────────────────────────────
export const RecordTripPaymentSchema = z.object({
  amount_paise: z.number().int().positive(),
  mode:         z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE']),
  reference:    z.string().max(80).optional(),
  received_at:  z.string().datetime().optional(),
  notes:        z.string().max(300).optional(),
})

// ─────────────────────────────────────────────────────────────
// GPS LOCATION PING
// ─────────────────────────────────────────────────────────────
export const LocationPingSchema = z.object({
  lat:         z.number().min(-90).max(90),
  lng:         z.number().min(-180).max(180),
  speed_kmh:   z.number().nonnegative().optional(),
  heading_deg: z.number().int().min(0).max(360).optional(),
  accuracy_m:  z.number().nonnegative().optional(),
  battery_pct: z.number().int().min(0).max(100).optional(),
  recorded_at: z.string().datetime().optional(),
})

// ─────────────────────────────────────────────────────────────
// MAINTENANCE
// ─────────────────────────────────────────────────────────────
export const LogMaintenanceSchema = z.object({
  vehicle_id:         z.string().uuid(),
  service_type:       z.enum(['OIL_CHANGE','TYRE_REPLACEMENT','BRAKE_SERVICE','ENGINE_REPAIR','GEARBOX','ELECTRICAL','BODY_WORK','AC_SERVICE','GENERAL_SERVICE','INSPECTION']),
  description:        z.string().max(500).optional(),
  odometer:           z.number().int().nonnegative().optional(),
  amount_paise:       z.number().int().nonnegative().default(0),
  parts_cost_paise:   z.number().int().nonnegative().default(0),
  labour_cost_paise:  z.number().int().nonnegative().default(0),
  vendor_name:        z.string().max(100).optional(),
  vendor_phone:       z.string().regex(/^\d{10}$/).optional(),
  service_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  next_service_km:    z.number().int().positive().optional(),
  next_service_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
})

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type CreateVehicleInput    = z.infer<typeof CreateVehicleSchema>
export type CreateDriverInput     = z.infer<typeof CreateDriverSchema>
export type CreateTripInput       = z.infer<typeof CreateTripSchema>
export type UpdateTripStatusInput = z.infer<typeof UpdateTripStatusSchema>
export type LogFuelInput          = z.infer<typeof LogFuelSchema>
export type LogExpenseInput       = z.infer<typeof LogExpenseSchema>
export type LocationPingInput     = z.infer<typeof LocationPingSchema>
export type LogMaintenanceInput   = z.infer<typeof LogMaintenanceSchema>
