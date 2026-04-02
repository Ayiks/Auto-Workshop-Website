// fix-units.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixUnits() {
  // Get the business we created in the previous step
  const firstBusiness = await prisma.business.findFirst(); 
  
  if (firstBusiness) {
    console.log(`Assigning global units to Business ID: ${firstBusiness.id}`);
    await prisma.globalUnit.updateMany({ 
      data: { businessId: firstBusiness.id } 
    });
    console.log("✅ Global units updated successfully!");
  } else {
    console.log("❌ No business found. Did you run the previous migration script?");
  }
}

fixUnits();