-- AlterTable: Add Arkesel messaging fields to business_settings
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "arkesel_api_key" VARCHAR(255);
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "arkesel_sender_id" VARCHAR(50);
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "arkesel_whatsapp_sender_id" VARCHAR(50);

-- AlterTable: Add recurring reminder fields to jobs
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "reminder_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "reminder_interval_months" INTEGER;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "reminder_types" TEXT[] DEFAULT ARRAY[]::TEXT[];
