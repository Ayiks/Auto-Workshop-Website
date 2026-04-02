-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "seq_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
