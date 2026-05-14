-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('sole_proprietor', 'company', 'partnership', 'trust', 'individual');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'co_owner', 'partner', 'manager', 'staff', 'custom');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CST', 'SUP', 'VND', 'AGT', 'PTR');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('trial', 'solo', 'plus', 'pro');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'paused', 'grace', 'cancelled');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('debit', 'credit', 'refund', 'adjustment');

-- CreateEnum
CREATE TYPE "TopupStatus" AS ENUM ('pending', 'success', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REVEAL', 'EXPORT', 'APPROVE', 'REJECT', 'CANCEL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ALERT');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('PLATFORM', 'ENTITY', 'BRANCH', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED', 'AUCTIONED', 'MIGRATED');

-- CreateEnum
CREATE TYPE "LoanClosureReason" AS ENUM ('REPAID', 'RENEWED', 'AUCTIONED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterestBasis" AS ENUM ('daily', 'monthly');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_DUTY', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ChitStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('PROPOSED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "zi_code_sequences" (
    "id" UUID NOT NULL,
    "code_prefix" TEXT NOT NULL,
    "last_sequence" TEXT NOT NULL,
    "total_issued" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_code_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_national_id_config" (
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "individual_id_name" TEXT,
    "individual_format" TEXT,
    "business_id_name" TEXT,
    "business_format" TEXT,
    "store_raw" BOOLEAN NOT NULL DEFAULT false,
    "store_hash" BOOLEAN NOT NULL DEFAULT true,
    "display_last" INTEGER NOT NULL DEFAULT 6,
    "verify_api" TEXT,

    CONSTRAINT "zi_national_id_config_pkey" PRIMARY KEY ("country_code")
);

-- CreateTable
CREATE TABLE "zi_individuals" (
    "id" UUID NOT NULL,
    "zi_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "national_id_type" TEXT,
    "national_id_hash" TEXT,
    "national_id_last6" TEXT,
    "national_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "auth_user_id" UUID,
    "avatar_url" TEXT,
    "preferred_lang" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "zi_individuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_individual_emails" (
    "id" UUID NOT NULL,
    "individual_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "became_current_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaced_at" TIMESTAMP(3),

    CONSTRAINT "zi_individual_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_individual_mobiles" (
    "id" UUID NOT NULL,
    "individual_id" UUID NOT NULL,
    "mobile_hash" TEXT NOT NULL,
    "mobile_last4" TEXT NOT NULL,
    "country_dial_code" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "became_current_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replaced_at" TIMESTAMP(3),
    "cooldown_until" TIMESTAMP(3),

    CONSTRAINT "zi_individual_mobiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_entities" (
    "id" UUID NOT NULL,
    "zi_code" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "entity_type" "EntityType" NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "business_id_type" TEXT,
    "business_id_hash" TEXT,
    "business_id_last6" TEXT,
    "business_id_verified" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "state" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_branches" (
    "id" UUID NOT NULL,
    "zi_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_subscriptions" (
    "id" UUID NOT NULL,
    "zi_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL DEFAULT 'trial',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "trial_start" DATE,
    "trial_end" DATE,
    "billing_start" DATE,
    "is_annual" BOOLEAN NOT NULL DEFAULT false,
    "max_users" INTEGER,
    "primary_owner_id" UUID,
    "billing_owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_memberships" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "individual_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "is_primary_owner" BOOLEAN NOT NULL DEFAULT false,
    "is_billing_owner" BOOLEAN NOT NULL DEFAULT false,
    "equity_percent" DECIMAL(5,2),
    "permissions" JSONB,
    "branch_access" JSONB,
    "invited_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_biz_contacts" (
    "id" UUID NOT NULL,
    "zi_code" TEXT NOT NULL,
    "ref_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "branch_id" UUID,
    "individual_id" UUID,
    "contact_type" "ContactType" NOT NULL,
    "display_name" TEXT NOT NULL,
    "mobile_display" TEXT,
    "email_display" TEXT,
    "tags" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_biz_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_wallet" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "balance_paise" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_billing_log" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "ref_code" TEXT,
    "balance_after_paise" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "zi_billing_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_billing_snapshot" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "active_user_count" INTEGER NOT NULL DEFAULT 0,
    "branch_count" INTEGER NOT NULL DEFAULT 0,
    "bundle_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "base_cost_paise" BIGINT NOT NULL DEFAULT 0,
    "discount_paise" BIGINT NOT NULL DEFAULT 0,
    "daily_cost_paise" BIGINT NOT NULL DEFAULT 0,
    "notification_cost_paise" BIGINT NOT NULL DEFAULT 0,
    "total_cost_paise" BIGINT NOT NULL DEFAULT 0,
    "deducted" BOOLEAN NOT NULL DEFAULT false,
    "deducted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_billing_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_topup_requests" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "individual_id" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT NOT NULL DEFAULT 'manual',
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "status" "TopupStatus" NOT NULL DEFAULT 'pending',
    "credited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_topup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_audit_logs" (
    "id" UUID NOT NULL,
    "entity_id" UUID,
    "branch_id" UUID,
    "actor_id" UUID,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_app_configs" (
    "id" UUID NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" UUID,
    "entity_id" UUID,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zi_app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_notifications" (
    "id" UUID NOT NULL,
    "entity_id" UUID,
    "target_user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_roles" (
    "id" UUID NOT NULL,
    "entity_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zi_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zi_permissions" (
    "code" TEXT NOT NULL,
    "description" TEXT,
    "product_code" TEXT,
    "is_core" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zi_permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "zi_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "zi_role_permissions_pkey" PRIMARY KEY ("role_id","permission")
);

-- CreateTable
CREATE TABLE "zi_member_roles" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "branch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zi_member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpn_schemes" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "scheme_code" TEXT NOT NULL,
    "scheme_name" TEXT NOT NULL,
    "description" TEXT,
    "interest_rate_pm" DECIMAL(5,2) NOT NULL,
    "interest_basis" "InterestBasis" NOT NULL DEFAULT 'daily',
    "ltv_gold_916" DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    "ltv_gold_999" DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    "ltv_silver" DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    "ltv_other" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "min_loan_paise" BIGINT NOT NULL DEFAULT 100000,
    "max_loan_paise" BIGINT NOT NULL DEFAULT 100000000,
    "min_tenure_days" INTEGER,
    "max_tenure_days" INTEGER,
    "penalty_enabled" BOOLEAN NOT NULL DEFAULT false,
    "penalty_grace_days" INTEGER NOT NULL DEFAULT 0,
    "penalty_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "penalty_basis" TEXT NOT NULL DEFAULT 'flat',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zpn_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpn_loans" (
    "id" UUID NOT NULL,
    "loan_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "branch_id" UUID,
    "scheme_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "principal_paise" BIGINT NOT NULL,
    "interest_rate_pm" DECIMAL(5,2) NOT NULL,
    "interest_basis" "InterestBasis" NOT NULL DEFAULT 'daily',
    "disbursed_at" TIMESTAMP(3) NOT NULL,
    "closure_date" DATE,
    "closed_at" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "closure_reason" "LoanClosureReason",
    "is_migrated" BOOLEAN NOT NULL DEFAULT false,
    "migration_notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zpn_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpn_loan_items" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metal_type" TEXT,
    "weight_grams" DECIMAL(10,3),
    "purity_percent" DECIMAL(5,2),
    "value_paise" BIGINT,
    "image_urls" JSONB NOT NULL DEFAULT '[]',
    "is_released" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zpn_loan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpn_tickets" (
    "id" UUID NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "loan_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zpn_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpn_payments" (
    "id" UUID NOT NULL,
    "payment_code" TEXT NOT NULL,
    "loan_id" UUID NOT NULL,
    "ticket_id" UUID,
    "subscription_id" UUID NOT NULL,
    "principal_paise" BIGINT NOT NULL DEFAULT 0,
    "interest_paise" BIGINT NOT NULL DEFAULT 0,
    "penalty_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "notes" TEXT,
    "receipt_url" TEXT,
    "recorded_by" UUID,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zpn_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zfl_vehicles" (
    "id" UUID NOT NULL,
    "vehicle_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "registration_no" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vehicle_type" TEXT,
    "capacity" TEXT,
    "fuel_type" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "image_urls" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zfl_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zfl_trips" (
    "id" UUID NOT NULL,
    "trip_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "driver_name" TEXT,
    "from_location" TEXT NOT NULL,
    "to_location" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "distance_km" DECIMAL(10,2),
    "fuel_cost_paise" BIGINT,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zfl_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zfl_maintenance" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "description" TEXT,
    "cost_paise" BIGINT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zfl_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zld_loads" (
    "id" UUID NOT NULL,
    "load_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "from_city" TEXT NOT NULL,
    "to_city" TEXT NOT NULL,
    "goods_type" TEXT,
    "weight_kg" DECIMAL(10,2),
    "volume_cbm" DECIMAL(10,2),
    "vehicle_type" TEXT,
    "budget_paise" BIGINT,
    "pickup_date" DATE NOT NULL,
    "status" "LoadStatus" NOT NULL DEFAULT 'OPEN',
    "contact_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zld_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zld_bookings" (
    "id" UUID NOT NULL,
    "booking_code" TEXT NOT NULL,
    "load_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "trucker_entity_id" UUID,
    "agreed_rate_paise" BIGINT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zld_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zdrv_drivers" (
    "id" UUID NOT NULL,
    "driver_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "individual_id" UUID,
    "display_name" TEXT NOT NULL,
    "license_no" TEXT,
    "license_expiry" DATE,
    "vehicle_types" JSONB NOT NULL DEFAULT '[]',
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "rating" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zdrv_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zdrv_engagements" (
    "id" UUID NOT NULL,
    "engagement_code" TEXT NOT NULL,
    "driver_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "rate_per_day" BIGINT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zdrv_engagements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpulse_appointments" (
    "id" UUID NOT NULL,
    "appt_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "patient_id" UUID,
    "patient_name" TEXT NOT NULL,
    "doctor_name" TEXT,
    "department" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "pulse_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zpulse_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "znd_requirements" (
    "id" UUID NOT NULL,
    "req_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "budget_paise" BIGINT,
    "deadline" DATE,
    "status" "RequirementStatus" NOT NULL DEFAULT 'OPEN',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "znd_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "znd_deals" (
    "id" UUID NOT NULL,
    "deal_code" TEXT NOT NULL,
    "requirement_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "supplier_entity_id" UUID,
    "proposed_paise" BIGINT,
    "status" "DealStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "znd_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcare_patients" (
    "id" UUID NOT NULL,
    "patient_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "individual_id" UUID,
    "display_name" TEXT NOT NULL,
    "dob" DATE,
    "gender" TEXT,
    "blood_group" TEXT,
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zcare_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcare_prescriptions" (
    "id" UUID NOT NULL,
    "rx_code" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "doctor_name" TEXT,
    "diagnosis" TEXT,
    "medications" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT,
    "prescribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zcare_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcht_funds" (
    "id" UUID NOT NULL,
    "fund_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "fund_name" TEXT NOT NULL,
    "monthly_paise" BIGINT NOT NULL,
    "total_members" INTEGER NOT NULL,
    "tenure_months" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "status" "ChitStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_month" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zcht_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcht_members" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "contact_id" UUID,
    "slot_number" INTEGER NOT NULL,
    "has_prized" BOOLEAN NOT NULL DEFAULT false,
    "prized_month" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zcht_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcht_auctions" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "winner_slot" INTEGER,
    "prize_amount_paise" BIGINT,
    "auction_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zcht_auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zfood_orders" (
    "id" UUID NOT NULL,
    "order_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "table_no" TEXT,
    "customer_name" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "subtotal_paise" BIGINT NOT NULL,
    "tax_paise" BIGINT NOT NULL DEFAULT 0,
    "discount_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_mode" TEXT,
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zfood_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zshp_orders" (
    "id" UUID NOT NULL,
    "order_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "branch_id" UUID,
    "contact_id" UUID,
    "items" JSONB NOT NULL DEFAULT '[]',
    "subtotal_paise" BIGINT NOT NULL,
    "discount_paise" BIGINT NOT NULL DEFAULT 0,
    "tax_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zshp_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zinv_invoices" (
    "id" UUID NOT NULL,
    "invoice_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "contact_id" UUID,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "subtotal_paise" BIGINT NOT NULL,
    "tax_paise" BIGINT NOT NULL DEFAULT 0,
    "discount_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "paid_paise" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zinv_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zqt_quotes" (
    "id" UUID NOT NULL,
    "quote_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "contact_id" UUID,
    "quote_date" DATE NOT NULL,
    "valid_until" DATE,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "total_paise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zqt_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zrpt_receipts" (
    "id" UUID NOT NULL,
    "receipt_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "contact_id" UUID,
    "ref_code" TEXT,
    "amount_paise" BIGINT NOT NULL,
    "payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "pdf_url" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zrpt_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zldg_entries" (
    "id" UUID NOT NULL,
    "entry_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "account_code" TEXT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "ref_code" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zldg_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zpost_ads" (
    "id" UUID NOT NULL,
    "ad_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "media_urls" JSONB NOT NULL DEFAULT '[]',
    "target_category" TEXT,
    "target_city" TEXT,
    "budget_paise" BIGINT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zpost_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zscn_documents" (
    "id" UUID NOT NULL,
    "doc_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "contact_id" UUID,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "ocr_text" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zscn_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zyl_yields" (
    "id" UUID NOT NULL,
    "yield_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "crop_type" TEXT NOT NULL,
    "field_name" TEXT,
    "area_acres" DECIMAL(10,2),
    "expected_kg" DECIMAL(10,2),
    "actual_kg" DECIMAL(10,2),
    "harvest_date" DATE,
    "market_rate_paise" BIGINT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zyl_yields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zbld_projects" (
    "id" UUID NOT NULL,
    "project_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "project_name" TEXT NOT NULL,
    "client_name" TEXT,
    "site_address" TEXT,
    "contract_value_paise" BIGINT,
    "start_date" DATE,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "completion_pct" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zbld_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zptn_partnerships" (
    "id" UUID NOT NULL,
    "partner_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "partner_entity_id" UUID,
    "partner_name" TEXT NOT NULL,
    "partner_type" TEXT NOT NULL,
    "revenue_share_pct" DECIMAL(5,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zptn_partnerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zcalc_results" (
    "id" UUID NOT NULL,
    "calc_code" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "calc_type" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zcalc_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TicketItems" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TicketItems_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "zi_code_sequences_code_prefix_key" ON "zi_code_sequences"("code_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "zi_individuals_zi_code_key" ON "zi_individuals"("zi_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_individuals_national_id_hash_key" ON "zi_individuals"("national_id_hash");

-- CreateIndex
CREATE UNIQUE INDEX "zi_individuals_auth_user_id_key" ON "zi_individuals"("auth_user_id");

-- CreateIndex
CREATE INDEX "zi_individuals_auth_user_id_idx" ON "zi_individuals"("auth_user_id");

-- CreateIndex
CREATE INDEX "zi_individual_emails_email_idx" ON "zi_individual_emails"("email");

-- CreateIndex
CREATE INDEX "zi_individual_emails_individual_id_idx" ON "zi_individual_emails"("individual_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_individual_emails_individual_id_email_key" ON "zi_individual_emails"("individual_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "zi_individual_mobiles_mobile_hash_key" ON "zi_individual_mobiles"("mobile_hash");

-- CreateIndex
CREATE INDEX "zi_individual_mobiles_mobile_hash_idx" ON "zi_individual_mobiles"("mobile_hash");

-- CreateIndex
CREATE INDEX "zi_individual_mobiles_individual_id_idx" ON "zi_individual_mobiles"("individual_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_entities_zi_code_key" ON "zi_entities"("zi_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_branches_ref_code_key" ON "zi_branches"("ref_code");

-- CreateIndex
CREATE INDEX "zi_branches_entity_id_idx" ON "zi_branches"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_branches_entity_id_zi_code_key" ON "zi_branches"("entity_id", "zi_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_subscriptions_ref_code_key" ON "zi_subscriptions"("ref_code");

-- CreateIndex
CREATE INDEX "zi_subscriptions_entity_id_idx" ON "zi_subscriptions"("entity_id");

-- CreateIndex
CREATE INDEX "zi_subscriptions_product_code_idx" ON "zi_subscriptions"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_subscriptions_entity_id_zi_code_key" ON "zi_subscriptions"("entity_id", "zi_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_memberships_ref_code_key" ON "zi_memberships"("ref_code");

-- CreateIndex
CREATE INDEX "zi_memberships_entity_id_idx" ON "zi_memberships"("entity_id");

-- CreateIndex
CREATE INDEX "zi_memberships_individual_id_idx" ON "zi_memberships"("individual_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_memberships_entity_id_individual_id_key" ON "zi_memberships"("entity_id", "individual_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_biz_contacts_ref_code_key" ON "zi_biz_contacts"("ref_code");

-- CreateIndex
CREATE INDEX "zi_biz_contacts_entity_id_idx" ON "zi_biz_contacts"("entity_id");

-- CreateIndex
CREATE INDEX "zi_biz_contacts_subscription_id_idx" ON "zi_biz_contacts"("subscription_id");

-- CreateIndex
CREATE INDEX "zi_biz_contacts_individual_id_idx" ON "zi_biz_contacts"("individual_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_biz_contacts_entity_id_subscription_id_contact_type_zi_c_key" ON "zi_biz_contacts"("entity_id", "subscription_id", "contact_type", "zi_code");

-- CreateIndex
CREATE UNIQUE INDEX "zi_wallet_entity_id_key" ON "zi_wallet"("entity_id");

-- CreateIndex
CREATE INDEX "zi_wallet_entity_id_idx" ON "zi_wallet"("entity_id");

-- CreateIndex
CREATE INDEX "zi_billing_log_entity_id_idx" ON "zi_billing_log"("entity_id");

-- CreateIndex
CREATE INDEX "zi_billing_log_created_at_idx" ON "zi_billing_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "zi_billing_snapshot_entity_id_idx" ON "zi_billing_snapshot"("entity_id");

-- CreateIndex
CREATE INDEX "zi_billing_snapshot_snapshot_date_idx" ON "zi_billing_snapshot"("snapshot_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "zi_billing_snapshot_entity_id_snapshot_date_key" ON "zi_billing_snapshot"("entity_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "zi_topup_requests_entity_id_idx" ON "zi_topup_requests"("entity_id");

-- CreateIndex
CREATE INDEX "zi_audit_logs_entity_id_created_at_idx" ON "zi_audit_logs"("entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "zi_audit_logs_resource_type_resource_id_idx" ON "zi_audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "zi_audit_logs_actor_id_idx" ON "zi_audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "zi_app_configs_scope_type_scope_id_idx" ON "zi_app_configs"("scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_app_configs_scope_type_scope_id_key_key" ON "zi_app_configs"("scope_type", "scope_id", "key");

-- CreateIndex
CREATE INDEX "zi_notifications_target_user_id_read_at_idx" ON "zi_notifications"("target_user_id", "read_at");

-- CreateIndex
CREATE INDEX "zi_notifications_entity_id_idx" ON "zi_notifications"("entity_id");

-- CreateIndex
CREATE INDEX "zi_roles_entity_id_idx" ON "zi_roles"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_roles_entity_id_name_key" ON "zi_roles"("entity_id", "name");

-- CreateIndex
CREATE INDEX "zi_member_roles_membership_id_idx" ON "zi_member_roles"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "zi_member_roles_membership_id_role_id_branch_id_key" ON "zi_member_roles"("membership_id", "role_id", "branch_id");

-- CreateIndex
CREATE INDEX "zpn_schemes_entity_id_idx" ON "zpn_schemes"("entity_id");

-- CreateIndex
CREATE INDEX "zpn_schemes_subscription_id_idx" ON "zpn_schemes"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zpn_schemes_subscription_id_scheme_code_key" ON "zpn_schemes"("subscription_id", "scheme_code");

-- CreateIndex
CREATE UNIQUE INDEX "zpn_loans_loan_code_key" ON "zpn_loans"("loan_code");

-- CreateIndex
CREATE INDEX "zpn_loans_entity_id_idx" ON "zpn_loans"("entity_id");

-- CreateIndex
CREATE INDEX "zpn_loans_subscription_id_idx" ON "zpn_loans"("subscription_id");

-- CreateIndex
CREATE INDEX "zpn_loans_contact_id_idx" ON "zpn_loans"("contact_id");

-- CreateIndex
CREATE INDEX "zpn_loans_status_idx" ON "zpn_loans"("status");

-- CreateIndex
CREATE INDEX "zpn_loan_items_loan_id_idx" ON "zpn_loan_items"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "zpn_tickets_ticket_code_key" ON "zpn_tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "zpn_tickets_loan_id_idx" ON "zpn_tickets"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "zpn_payments_payment_code_key" ON "zpn_payments"("payment_code");

-- CreateIndex
CREATE INDEX "zpn_payments_loan_id_idx" ON "zpn_payments"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "zfl_vehicles_vehicle_code_key" ON "zfl_vehicles"("vehicle_code");

-- CreateIndex
CREATE INDEX "zfl_vehicles_entity_id_idx" ON "zfl_vehicles"("entity_id");

-- CreateIndex
CREATE INDEX "zfl_vehicles_subscription_id_idx" ON "zfl_vehicles"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zfl_trips_trip_code_key" ON "zfl_trips"("trip_code");

-- CreateIndex
CREATE INDEX "zfl_trips_entity_id_idx" ON "zfl_trips"("entity_id");

-- CreateIndex
CREATE INDEX "zfl_trips_vehicle_id_idx" ON "zfl_trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "zfl_maintenance_vehicle_id_idx" ON "zfl_maintenance"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "zld_loads_load_code_key" ON "zld_loads"("load_code");

-- CreateIndex
CREATE INDEX "zld_loads_entity_id_idx" ON "zld_loads"("entity_id");

-- CreateIndex
CREATE INDEX "zld_loads_subscription_id_idx" ON "zld_loads"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zld_bookings_booking_code_key" ON "zld_bookings"("booking_code");

-- CreateIndex
CREATE INDEX "zld_bookings_load_id_idx" ON "zld_bookings"("load_id");

-- CreateIndex
CREATE UNIQUE INDEX "zdrv_drivers_driver_code_key" ON "zdrv_drivers"("driver_code");

-- CreateIndex
CREATE INDEX "zdrv_drivers_entity_id_idx" ON "zdrv_drivers"("entity_id");

-- CreateIndex
CREATE INDEX "zdrv_drivers_subscription_id_idx" ON "zdrv_drivers"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zdrv_engagements_engagement_code_key" ON "zdrv_engagements"("engagement_code");

-- CreateIndex
CREATE INDEX "zdrv_engagements_driver_id_idx" ON "zdrv_engagements"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "zpulse_appointments_appt_code_key" ON "zpulse_appointments"("appt_code");

-- CreateIndex
CREATE INDEX "zpulse_appointments_entity_id_idx" ON "zpulse_appointments"("entity_id");

-- CreateIndex
CREATE INDEX "zpulse_appointments_subscription_id_idx" ON "zpulse_appointments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "znd_requirements_req_code_key" ON "znd_requirements"("req_code");

-- CreateIndex
CREATE INDEX "znd_requirements_entity_id_idx" ON "znd_requirements"("entity_id");

-- CreateIndex
CREATE INDEX "znd_requirements_subscription_id_idx" ON "znd_requirements"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "znd_deals_deal_code_key" ON "znd_deals"("deal_code");

-- CreateIndex
CREATE INDEX "znd_deals_requirement_id_idx" ON "znd_deals"("requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "zcare_patients_patient_code_key" ON "zcare_patients"("patient_code");

-- CreateIndex
CREATE INDEX "zcare_patients_entity_id_idx" ON "zcare_patients"("entity_id");

-- CreateIndex
CREATE INDEX "zcare_patients_subscription_id_idx" ON "zcare_patients"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zcare_prescriptions_rx_code_key" ON "zcare_prescriptions"("rx_code");

-- CreateIndex
CREATE INDEX "zcare_prescriptions_patient_id_idx" ON "zcare_prescriptions"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "zcht_funds_fund_code_key" ON "zcht_funds"("fund_code");

-- CreateIndex
CREATE INDEX "zcht_funds_entity_id_idx" ON "zcht_funds"("entity_id");

-- CreateIndex
CREATE INDEX "zcht_funds_subscription_id_idx" ON "zcht_funds"("subscription_id");

-- CreateIndex
CREATE INDEX "zcht_members_fund_id_idx" ON "zcht_members"("fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "zcht_members_fund_id_slot_number_key" ON "zcht_members"("fund_id", "slot_number");

-- CreateIndex
CREATE UNIQUE INDEX "zcht_auctions_fund_id_month_key" ON "zcht_auctions"("fund_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "zfood_orders_order_code_key" ON "zfood_orders"("order_code");

-- CreateIndex
CREATE INDEX "zfood_orders_entity_id_idx" ON "zfood_orders"("entity_id");

-- CreateIndex
CREATE INDEX "zfood_orders_subscription_id_idx" ON "zfood_orders"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zshp_orders_order_code_key" ON "zshp_orders"("order_code");

-- CreateIndex
CREATE INDEX "zshp_orders_entity_id_idx" ON "zshp_orders"("entity_id");

-- CreateIndex
CREATE INDEX "zshp_orders_subscription_id_idx" ON "zshp_orders"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zinv_invoices_invoice_code_key" ON "zinv_invoices"("invoice_code");

-- CreateIndex
CREATE INDEX "zinv_invoices_entity_id_idx" ON "zinv_invoices"("entity_id");

-- CreateIndex
CREATE INDEX "zinv_invoices_subscription_id_idx" ON "zinv_invoices"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zqt_quotes_quote_code_key" ON "zqt_quotes"("quote_code");

-- CreateIndex
CREATE INDEX "zqt_quotes_entity_id_idx" ON "zqt_quotes"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zrpt_receipts_receipt_code_key" ON "zrpt_receipts"("receipt_code");

-- CreateIndex
CREATE INDEX "zrpt_receipts_entity_id_idx" ON "zrpt_receipts"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zldg_entries_entry_code_key" ON "zldg_entries"("entry_code");

-- CreateIndex
CREATE INDEX "zldg_entries_entity_id_idx" ON "zldg_entries"("entity_id");

-- CreateIndex
CREATE INDEX "zldg_entries_subscription_id_idx" ON "zldg_entries"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zpost_ads_ad_code_key" ON "zpost_ads"("ad_code");

-- CreateIndex
CREATE INDEX "zpost_ads_entity_id_idx" ON "zpost_ads"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zscn_documents_doc_code_key" ON "zscn_documents"("doc_code");

-- CreateIndex
CREATE INDEX "zscn_documents_entity_id_idx" ON "zscn_documents"("entity_id");

-- CreateIndex
CREATE INDEX "zscn_documents_subscription_id_idx" ON "zscn_documents"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "zyl_yields_yield_code_key" ON "zyl_yields"("yield_code");

-- CreateIndex
CREATE INDEX "zyl_yields_entity_id_idx" ON "zyl_yields"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zbld_projects_project_code_key" ON "zbld_projects"("project_code");

-- CreateIndex
CREATE INDEX "zbld_projects_entity_id_idx" ON "zbld_projects"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zptn_partnerships_partner_code_key" ON "zptn_partnerships"("partner_code");

-- CreateIndex
CREATE INDEX "zptn_partnerships_entity_id_idx" ON "zptn_partnerships"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "zcalc_results_calc_code_key" ON "zcalc_results"("calc_code");

-- CreateIndex
CREATE INDEX "zcalc_results_entity_id_idx" ON "zcalc_results"("entity_id");

-- CreateIndex
CREATE INDEX "_TicketItems_B_index" ON "_TicketItems"("B");

-- AddForeignKey
ALTER TABLE "zi_individual_emails" ADD CONSTRAINT "zi_individual_emails_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "zi_individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_individual_mobiles" ADD CONSTRAINT "zi_individual_mobiles_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "zi_individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_branches" ADD CONSTRAINT "zi_branches_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_subscriptions" ADD CONSTRAINT "zi_subscriptions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_subscriptions" ADD CONSTRAINT "zi_subscriptions_primary_owner_id_fkey" FOREIGN KEY ("primary_owner_id") REFERENCES "zi_individuals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_subscriptions" ADD CONSTRAINT "zi_subscriptions_billing_owner_id_fkey" FOREIGN KEY ("billing_owner_id") REFERENCES "zi_individuals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_memberships" ADD CONSTRAINT "zi_memberships_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_memberships" ADD CONSTRAINT "zi_memberships_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "zi_individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_biz_contacts" ADD CONSTRAINT "zi_biz_contacts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_biz_contacts" ADD CONSTRAINT "zi_biz_contacts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_biz_contacts" ADD CONSTRAINT "zi_biz_contacts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "zi_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_biz_contacts" ADD CONSTRAINT "zi_biz_contacts_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "zi_individuals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_wallet" ADD CONSTRAINT "zi_wallet_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_billing_log" ADD CONSTRAINT "zi_billing_log_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_billing_log" ADD CONSTRAINT "zi_billing_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "zi_individuals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_billing_snapshot" ADD CONSTRAINT "zi_billing_snapshot_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_topup_requests" ADD CONSTRAINT "zi_topup_requests_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_topup_requests" ADD CONSTRAINT "zi_topup_requests_individual_id_fkey" FOREIGN KEY ("individual_id") REFERENCES "zi_individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_audit_logs" ADD CONSTRAINT "zi_audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_audit_logs" ADD CONSTRAINT "zi_audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "zi_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_audit_logs" ADD CONSTRAINT "zi_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "zi_individuals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_app_configs" ADD CONSTRAINT "zi_app_configs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_notifications" ADD CONSTRAINT "zi_notifications_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_notifications" ADD CONSTRAINT "zi_notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "zi_individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_roles" ADD CONSTRAINT "zi_roles_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "zi_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_role_permissions" ADD CONSTRAINT "zi_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "zi_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_role_permissions" ADD CONSTRAINT "zi_role_permissions_permission_fkey" FOREIGN KEY ("permission") REFERENCES "zi_permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_member_roles" ADD CONSTRAINT "zi_member_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "zi_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zi_member_roles" ADD CONSTRAINT "zi_member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "zi_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_schemes" ADD CONSTRAINT "zpn_schemes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_loans" ADD CONSTRAINT "zpn_loans_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_loans" ADD CONSTRAINT "zpn_loans_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "zpn_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_loans" ADD CONSTRAINT "zpn_loans_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "zi_biz_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_loan_items" ADD CONSTRAINT "zpn_loan_items_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "zpn_loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_tickets" ADD CONSTRAINT "zpn_tickets_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "zpn_loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_payments" ADD CONSTRAINT "zpn_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "zpn_loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpn_payments" ADD CONSTRAINT "zpn_payments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "zpn_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zfl_vehicles" ADD CONSTRAINT "zfl_vehicles_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zfl_trips" ADD CONSTRAINT "zfl_trips_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zfl_trips" ADD CONSTRAINT "zfl_trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "zfl_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zfl_maintenance" ADD CONSTRAINT "zfl_maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "zfl_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zld_loads" ADD CONSTRAINT "zld_loads_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zld_bookings" ADD CONSTRAINT "zld_bookings_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "zld_loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zdrv_drivers" ADD CONSTRAINT "zdrv_drivers_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zdrv_engagements" ADD CONSTRAINT "zdrv_engagements_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "zdrv_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zdrv_engagements" ADD CONSTRAINT "zdrv_engagements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpulse_appointments" ADD CONSTRAINT "zpulse_appointments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "znd_requirements" ADD CONSTRAINT "znd_requirements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "znd_deals" ADD CONSTRAINT "znd_deals_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "znd_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "znd_deals" ADD CONSTRAINT "znd_deals_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcare_patients" ADD CONSTRAINT "zcare_patients_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcare_prescriptions" ADD CONSTRAINT "zcare_prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "zcare_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcare_prescriptions" ADD CONSTRAINT "zcare_prescriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcht_funds" ADD CONSTRAINT "zcht_funds_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcht_members" ADD CONSTRAINT "zcht_members_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "zcht_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcht_auctions" ADD CONSTRAINT "zcht_auctions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "zcht_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zfood_orders" ADD CONSTRAINT "zfood_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zshp_orders" ADD CONSTRAINT "zshp_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zinv_invoices" ADD CONSTRAINT "zinv_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zqt_quotes" ADD CONSTRAINT "zqt_quotes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zrpt_receipts" ADD CONSTRAINT "zrpt_receipts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zldg_entries" ADD CONSTRAINT "zldg_entries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zpost_ads" ADD CONSTRAINT "zpost_ads_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zscn_documents" ADD CONSTRAINT "zscn_documents_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zyl_yields" ADD CONSTRAINT "zyl_yields_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zbld_projects" ADD CONSTRAINT "zbld_projects_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zptn_partnerships" ADD CONSTRAINT "zptn_partnerships_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zcalc_results" ADD CONSTRAINT "zcalc_results_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "zi_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TicketItems" ADD CONSTRAINT "_TicketItems_A_fkey" FOREIGN KEY ("A") REFERENCES "zpn_loan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TicketItems" ADD CONSTRAINT "_TicketItems_B_fkey" FOREIGN KEY ("B") REFERENCES "zpn_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

