-- Add mileage column to vehicles table
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "mileage" INTEGER;
