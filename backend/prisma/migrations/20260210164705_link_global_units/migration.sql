-- AlterTable
ALTER TABLE "material_units" ADD COLUMN     "unit_id" INTEGER;

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "material_unit_id" INTEGER;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_material_unit_id_fkey" FOREIGN KEY ("material_unit_id") REFERENCES "global_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_units" ADD CONSTRAINT "material_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "global_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
