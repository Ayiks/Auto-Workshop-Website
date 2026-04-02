-- AddColumn: sms_enabled to business_settings
-- This column was added via prisma db push and is already present in the database.
-- This migration file exists solely to record that fact in Prisma's migration history.

ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "sms_enabled" BOOLEAN NOT NULL DEFAULT false;
