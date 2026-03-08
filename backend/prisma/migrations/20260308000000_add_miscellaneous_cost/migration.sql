-- Add miscellaneous_cost to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "miscellaneous_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add miscellaneous_cost to invoices table
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "miscellaneous_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
