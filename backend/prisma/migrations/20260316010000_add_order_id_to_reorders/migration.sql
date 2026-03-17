-- Add order_id to material_reorders for grouping bulk order sessions
ALTER TABLE "material_reorders"
  ADD COLUMN IF NOT EXISTS "order_id" VARCHAR(36);

-- Index for efficient grouping queries
CREATE INDEX IF NOT EXISTS "material_reorders_order_id_idx"
  ON "material_reorders"("order_id", "business_id");
