-- CreateTable: job_photos
CREATE TABLE IF NOT EXISTS "job_photos" (
  "id"          SERIAL PRIMARY KEY,
  "job_id"      INTEGER NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  "url"         VARCHAR(500) NOT NULL,
  "public_id"   VARCHAR(200) NOT NULL,
  "caption"     VARCHAR(20),
  "uploaded_by" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "business_id" VARCHAR(36) NOT NULL REFERENCES "businesses"("id")
);

CREATE INDEX IF NOT EXISTS "job_photos_job_id_idx" ON "job_photos"("job_id");

-- AlterTable: add enabled_job_types to business_settings
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "enabled_job_types" TEXT[] NOT NULL DEFAULT ARRAY['mechanic','sprayer','bodyworks','other'];
