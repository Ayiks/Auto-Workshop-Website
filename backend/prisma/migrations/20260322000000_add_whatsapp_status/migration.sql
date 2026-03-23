-- Add whatsapp_status column if it was missed by a prior migration
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "whatsapp_status" VARCHAR(20) DEFAULT 'unregistered';
