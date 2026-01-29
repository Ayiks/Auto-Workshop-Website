-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customer_id" INTEGER,
ADD COLUMN     "customer_phone" VARCHAR(20);

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
