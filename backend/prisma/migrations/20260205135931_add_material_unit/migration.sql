-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "baseUnit" TEXT NOT NULL DEFAULT 'piece';

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "materialUnitId" INTEGER;

-- CreateTable
CREATE TABLE "material_units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "factor" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "materialId" INTEGER NOT NULL,

    CONSTRAINT "material_units_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "material_units" ADD CONSTRAINT "material_units_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_materialUnitId_fkey" FOREIGN KEY ("materialUnitId") REFERENCES "material_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
