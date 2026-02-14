// migrate-tenant.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log("🚀 Starting SaaS Tenant Migration...");

  try {
    // 1. Create the first Business for your existing client
    console.log("📦 1. Creating the primary Business account...");
    const firstBusiness = await prisma.business.create({
      data: { 
        name: "Main Auto Workshop", // You can change this to their actual business name
        plan: "pro", // Give them the top tier plan
      }
    });

    const bId = firstBusiness.id;
    console.log(`✅ Business Created with ID: ${bId}`);

    // 2. Move all existing users
    console.log("👥 2. Migrating Users & Customers...");
    await prisma.user.updateMany({ data: { businessId: bId } });
    await prisma.customer.updateMany({ data: { businessId: bId } });

    // 3. Move all Inventory & Services
    console.log("🔧 3. Migrating Materials & Services...");
    await prisma.material.updateMany({ data: { businessId: bId } });
    await prisma.materialUnit.updateMany({ data: { businessId: bId } });
    await prisma.materialReorder.updateMany({ data: { businessId: bId } });
    await prisma.service.updateMany({ data: { businessId: bId } });

    // 4. Move all Core Operations (Sales & Jobs)
    console.log("🚗 4. Migrating Sales & Jobs...");
    await prisma.sale.updateMany({ data: { businessId: bId } });
    await prisma.saleItem.updateMany({ data: { businessId: bId } });
    await prisma.job.updateMany({ data: { businessId: bId } });
    await prisma.jobMaterial.updateMany({ data: { businessId: bId } });

    // 5. Move Finance & Bookings
    console.log("💰 5. Migrating Finances, Bookings & Settings...");
    await prisma.invoice.updateMany({ data: { businessId: bId } });
    await prisma.payment.updateMany({ data: { businessId: bId } });
    await prisma.receipt.updateMany({ data: { businessId: bId } });
    await prisma.expense.updateMany({ data: { businessId: bId } });
    await prisma.booking.updateMany({ data: { businessId: bId } });
    await prisma.businessSettings.updateMany({ data: { businessId: bId } });
    await prisma.auditLog.updateMany({ data: { businessId: bId } });

    console.log("🎉 Migration Complete! All existing data is now secured under the first tenant.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();