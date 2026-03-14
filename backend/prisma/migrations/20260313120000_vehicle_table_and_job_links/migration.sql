-- Migration: vehicle_table_and_job_links
-- Safe additive migration: no existing data is modified or deleted.
-- New columns are all nullable. New table is created fresh.
-- Phone uniqueness is changed from global to per-business (safe: global constraint
-- prevented cross-business duplicates, so no existing rows can violate the new index).

-- Step 1: Fix phone uniqueness from global to per-business
DROP INDEX IF EXISTS "customers_phone_key";
CREATE UNIQUE INDEX "customers_phone_business_id_key" ON "customers"("phone", "business_id");

-- Step 2: Add preferredContact to customers (nullable)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferred_contact" VARCHAR(20);

-- Step 3: Create vehicles table
CREATE TABLE IF NOT EXISTS "vehicles" (
  "id"           SERIAL PRIMARY KEY,
  "customer_id"  INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "make"         VARCHAR(50),
  "model"        VARCHAR(50),
  "year"         INTEGER,
  "reg_number"   VARCHAR(20),
  "color"        VARCHAR(30),
  "vin"          VARCHAR(50),
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "business_id"  TEXT NOT NULL REFERENCES "businesses"("id")
);

-- Partial unique index on reg_number per business (only when reg_number is not null)
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_reg_number_business_id_key"
  ON "vehicles"("reg_number", "business_id")
  WHERE "reg_number" IS NOT NULL;

-- Step 4: Add customer_id, vehicle_id, and odometer to jobs (all nullable)
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "customer_id" INTEGER REFERENCES "customers"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "vehicle_id"  INTEGER REFERENCES "vehicles"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "odometer"    INTEGER;
