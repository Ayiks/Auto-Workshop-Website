-- Add optional payment-detail columns to business_settings for invoice
-- "Payment Information" section (bank transfer + mobile money).
-- Purely additive: existing rows are untouched and get NULL values.
ALTER TABLE "business_settings" ADD COLUMN "bank_name" VARCHAR(100);
ALTER TABLE "business_settings" ADD COLUMN "bank_account_name" VARCHAR(100);
ALTER TABLE "business_settings" ADD COLUMN "bank_account_number" VARCHAR(50);
ALTER TABLE "business_settings" ADD COLUMN "momo_number" VARCHAR(30);
ALTER TABLE "business_settings" ADD COLUMN "momo_name" VARCHAR(100);
ALTER TABLE "business_settings" ADD COLUMN "invoice_payment_note" VARCHAR(200);
