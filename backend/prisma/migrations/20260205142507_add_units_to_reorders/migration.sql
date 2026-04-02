-- AlterTable
ALTER TABLE "material_reorders" ADD COLUMN     "material_unit_id" INTEGER;

-- AddForeignKey
ALTER TABLE "material_reorders" ADD CONSTRAINT "material_reorders_material_unit_id_fkey" FOREIGN KEY ("material_unit_id") REFERENCES "material_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
