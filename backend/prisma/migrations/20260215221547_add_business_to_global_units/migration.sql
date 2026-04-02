/*
  Warnings:

  - Made the column `business_id` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `business_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `expenses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `job_materials` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `material_reorders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `material_units` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `materials` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `receipts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `sale_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `sales` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `services` required. This step will fail if there are existing NULL values in that column.
  - Made the column `business_id` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_business_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_business_id_fkey";

-- DropForeignKey
ALTER TABLE "business_settings" DROP CONSTRAINT "business_settings_business_id_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_business_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_business_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_business_id_fkey";

-- DropForeignKey
ALTER TABLE "job_materials" DROP CONSTRAINT "job_materials_business_id_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_business_id_fkey";

-- DropForeignKey
ALTER TABLE "material_reorders" DROP CONSTRAINT "material_reorders_business_id_fkey";

-- DropForeignKey
ALTER TABLE "material_units" DROP CONSTRAINT "material_units_business_id_fkey";

-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_business_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_business_id_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_business_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_business_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_business_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_business_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_business_id_fkey";

-- DropIndex
DROP INDEX "global_units_name_key";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "business_settings" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "global_units" ADD COLUMN     "business_id" TEXT;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "job_materials" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "material_reorders" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "material_units" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sale_items" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "business_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "business_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_units" ADD CONSTRAINT "material_units_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_reorders" ADD CONSTRAINT "material_reorders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_units" ADD CONSTRAINT "global_units_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_materials" ADD CONSTRAINT "job_materials_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
