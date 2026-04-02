/*
  Warnings:

  - You are about to drop the column `created_at` on the `businesses` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `businesses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "businesses" DROP COLUMN "created_at",
DROP COLUMN "is_active",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payment_gateway_id" VARCHAR(255),
ADD COLUMN     "payment_gateway_provider" VARCHAR(50),
ADD COLUMN     "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'active';
