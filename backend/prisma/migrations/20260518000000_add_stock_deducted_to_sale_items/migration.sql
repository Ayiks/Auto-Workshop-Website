-- Add per-line tracking of whether stock was deducted at sale time.
-- Backdated sales without "Deduct from stock" never reduced inventory,
-- so deleting them must NOT add stock back. Existing rows default to
-- true (the legacy behaviour), so historical sales still reverse on delete.
ALTER TABLE "sale_items"
    ADD COLUMN "stock_deducted" BOOLEAN NOT NULL DEFAULT true;
