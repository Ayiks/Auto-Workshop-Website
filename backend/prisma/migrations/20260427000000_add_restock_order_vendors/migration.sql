-- CreateTable: restock_order_vendors
-- Stores per-vendor payment tracking for bulk restock orders.
-- Each row ties one vendor to one order (orderId UUID) with
-- its own amountPaid / paymentStatus / paidAt.
CREATE TABLE "restock_order_vendors" (
    "id"             SERIAL NOT NULL,
    "order_id"       VARCHAR(36) NOT NULL,
    "vendor_id"      INTEGER NOT NULL,
    "business_id"    TEXT NOT NULL,
    "amount_paid"    DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    "paid_at"        TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_order_vendors_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex: one row per (order, vendor)
CREATE UNIQUE INDEX "restock_order_vendors_order_id_vendor_id_key"
    ON "restock_order_vendors"("order_id", "vendor_id");

-- AddForeignKey: vendor_id → vendors.id
ALTER TABLE "restock_order_vendors"
    ADD CONSTRAINT "restock_order_vendors_vendor_id_fkey"
    FOREIGN KEY ("vendor_id")
    REFERENCES "vendors"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: business_id → businesses.id
ALTER TABLE "restock_order_vendors"
    ADD CONSTRAINT "restock_order_vendors_business_id_fkey"
    FOREIGN KEY ("business_id")
    REFERENCES "businesses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
