-- Messaging architecture: API key moves to platform .env, remove per-business key
-- Add whatsapp_status to track registration state per business

ALTER TABLE "business_settings" DROP COLUMN IF EXISTS "arkesel_api_key";
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "whatsapp_status" VARCHAR(20) DEFAULT 'unregistered';
