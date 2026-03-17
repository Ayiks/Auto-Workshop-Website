-- CreateTable: vendors
CREATE TABLE "vendors" (
  "id"               SERIAL PRIMARY KEY,
  "company_name"     VARCHAR(100) NOT NULL,
  "contact_name"     VARCHAR(100),
  "phone"            VARCHAR(20),
  "email"            VARCHAR(100),
  "whatsapp_number"  VARCHAR(20),
  "location"         VARCHAR(200),
  "notes"            TEXT,
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "business_id"      TEXT NOT NULL REFERENCES "businesses"("id")
);

-- AlterTable: material_reorders
-- Existing records had their stock already applied, so they default to 'received'.
-- New inserts will always pass status='pending' explicitly from application code.
ALTER TABLE "material_reorders"
  ADD COLUMN "status"              VARCHAR(20) NOT NULL DEFAULT 'received',
  ADD COLUMN "vendor_id"           INTEGER REFERENCES "vendors"("id") ON DELETE SET NULL,
  ADD COLUMN "received_date"       TIMESTAMP(3),
  ADD COLUMN "received_by"         INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN "notification_sent"   BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX "material_reorders_status_business_idx" ON "material_reorders"("status", "business_id");
CREATE INDEX "vendors_business_id_idx" ON "vendors"("business_id");
