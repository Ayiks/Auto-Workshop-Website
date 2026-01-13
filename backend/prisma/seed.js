import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out in production)
  await prisma.auditLog.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.jobMaterial.deleteMany();
  await prisma.job.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.materialReorder.deleteMany();
  await prisma.material.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.businessSettings.deleteMany();

  // 1. Create Business Settings
  const businessSettings = await prisma.businessSettings.create({
    data: {
      name: 'Auto Workshop',
      address: 'Accra, Greater Accra, Ghana',
      phone: '+233 24 123 4567',
      email: 'info@autoworkshop.com',
      website: 'https://autoworkshop.com',
    },
  });
  console.log('✅ Business settings created');

  // 2. Create Users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      email: 'admin@workshop.com',
      phone: '+233 24 000 0001',
      role: 'admin',
      permissions: {
        materials: ['view', 'create', 'edit', 'delete', 'reorder'],
        sales: ['create', 'view'],
        booth: ['view', 'edit', 'sell', 'book'],
        jobs: ['viewAll', 'edit', 'delete'],
        expenses: ['view', 'create', 'edit', 'delete'],
        reports: ['view', 'viewAdvanced'],
        users: ['view', 'create', 'edit', 'delete', 'managePermissions'],
        dashboard: ['viewAdmin'],
      },
    },
  });

  const sales = await prisma.user.create({
    data: {
      username: 'sales1',
      passwordHash: hashedPassword,
      fullName: 'Sarah Sales',
      email: 'sales@workshop.com',
      phone: '+233 24 000 0002',
      role: 'sales',
      permissions: {
        materials: ['view'],
        sales: ['create', 'viewOwn'],
        booth: ['sell', 'book'],
        dashboard: ['viewBasic'],
      },
    },
  });

  const mechanic = await prisma.user.create({
    data: {
      username: 'mechanic1',
      passwordHash: hashedPassword,
      fullName: 'Mike Mechanic',
      email: 'mechanic@workshop.com',
      phone: '+233 24 000 0003',
      role: 'mechanic',
      permissions: {
        materials: ['view'],
        jobs: ['create', 'viewOwn', 'editOwn'],
        dashboard: ['viewBasic'],
      },
    },
  });

  const sprayer = await prisma.user.create({
    data: {
      username: 'sprayer1',
      passwordHash: hashedPassword,
      fullName: 'Sam Sprayer',
      email: 'sprayer@workshop.com',
      phone: '+233 24 000 0004',
      role: 'sprayer',
      permissions: {
        materials: ['view'],
        jobs: ['create', 'viewOwn', 'editOwn'],
        dashboard: ['viewBasic'],
      },
    },
  });

  const bodyworks = await prisma.user.create({
    data: {
      username: 'bodyworks1',
      passwordHash: hashedPassword,
      fullName: 'Bob Bodyworks',
      email: 'bodyworks@workshop.com',
      phone: '+233 24 000 0005',
      role: 'bodyworks',
      permissions: {
        materials: ['view'],
        jobs: ['create', 'viewOwn', 'editOwn'],
        dashboard: ['viewBasic'],
      },
    },
  });

  console.log('✅ Users created (password: password123)');

  // 3. Create Materials
  const materials = await prisma.material.createMany({
    data: [
      {
        name: 'Engine Oil 5W-30',
        quantity: 50,
        unitCost: 45.00,
        sellingPrice: 65.00,
        lowStockThreshold: 10,
      },
      {
        name: 'Brake Pads',
        quantity: 30,
        unitCost: 80.00,
        sellingPrice: 120.00,
        lowStockThreshold: 5,
      },
      {
        name: 'Air Filter',
        quantity: 25,
        unitCost: 35.00,
        sellingPrice: 55.00,
        lowStockThreshold: 8,
      },
      {
        name: 'Spark Plugs (Set of 4)',
        quantity: 40,
        unitCost: 60.00,
        sellingPrice: 90.00,
        lowStockThreshold: 10,
      },
      {
        name: 'Windshield Wipers',
        quantity: 15,
        unitCost: 25.00,
        sellingPrice: 40.00,
        lowStockThreshold: 5,
      },
      {
        name: 'Coolant (1L)',
        quantity: 8,  // Below threshold - will show as low stock
        unitCost: 30.00,
        sellingPrice: 50.00,
        lowStockThreshold: 10,
      },
    ],
  });
  console.log('✅ Materials created');

  // 4. Create Service (Booth)
  const boothService = await prisma.service.create({
    data: {
      type: 'booth',
      price: 150.00,
    },
  });
  console.log('✅ Booth service created');

  // 5. Create Sample Bookings
  await prisma.booking.createMany({
    data: [
      {
        bookingType: 'booth',
        clientName: 'John Doe',
        clientPhone: '+233 24 111 1111',
        clientEmail: 'john@example.com',
        preferredDate: new Date('2026-01-15'),
        preferredTime: '10:00 AM',
        message: 'Need booth service for painting',
        status: 'new',
      },
      {
        bookingType: 'service_inquiry',
        clientName: 'Jane Smith',
        clientPhone: '+233 24 222 2222',
        clientEmail: 'jane@example.com',
        serviceType: 'Engine Check',
        message: 'Car making strange noise',
        status: 'new',
      },
    ],
  });
  console.log('✅ Bookings created');

  console.log(`
🎉 Seed completed successfully!

📝 Test Accounts:
-------------------
Admin:
  Username: admin
  Password: password123

Sales:
  Username: sales1
  Password: password123

Mechanic:
  Username: mechanic1
  Password: password123

Sprayer:
  Username: sprayer1
  Password: password123

Body Works:
  Username: bodyworks1
  Password: password123

🏪 Sample Data:
-------------------
- 6 Materials (1 low stock)
- 1 Booth Service (GH₵ 150)
- 2 Bookings (pending)
`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });