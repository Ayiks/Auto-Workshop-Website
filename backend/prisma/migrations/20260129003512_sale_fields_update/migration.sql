-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customer_name" VARCHAR(100),
ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_status" VARCHAR(20) NOT NULL DEFAULT 'paid';
