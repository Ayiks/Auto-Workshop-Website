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
  
  console.log('📦 Creating materials...');
  await prisma.material.createMany({
    data: [
      { id: 11, name: 'Lacquer', quantity: 3.00, unitCost: 85.00, sellingPrice: 100.00, lowStockThreshold: 3.00, isActive: true, createdAt: new Date('2026-01-20T21:08:40.872Z'), updatedAt: new Date('2026-01-22T13:22:19.857Z') },
      { id: 12, name: 'Hiq Hardner', quantity: 3.00, unitCost: 88.00, sellingPrice: 100.00, lowStockThreshold: 3.00, isActive: true, createdAt: new Date('2026-01-20T21:12:11.518Z'), updatedAt: new Date('2026-01-22T13:41:17.563Z') },
      { id: 13, name: 'Matt Black', quantity: 0.50, unitCost: 68.00, sellingPrice: 70.00, lowStockThreshold: 3.00, isActive: true, createdAt: new Date('2026-01-20T21:12:40.723Z'), updatedAt: new Date('2026-01-21T07:20:01.722Z') },
      { id: 14, name: 'Putty', quantity: 11.00, unitCost: 80.00, sellingPrice: 105.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:13:11.29Z'), updatedAt: new Date('2026-01-20T21:13:11.29Z') },
      { id: 15, name: 'Hiq Slow Thinner', quantity: 0.50, unitCost: 58.00, sellingPrice: 70.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:14:00.193Z'), updatedAt: new Date('2026-01-22T13:20:05.888Z') },
      { id: 17, name: 'Paper', quantity: 1.00, unitCost: 34.00, sellingPrice: 40.00, lowStockThreshold: 3.00, isActive: true, createdAt: new Date('2026-01-20T21:15:24.269Z'), updatedAt: new Date('2026-01-22T13:20:05.875Z') },
      { id: 18, name: 'Sandpaper 400', quantity: 28.00, unitCost: 3.10, sellingPrice: 5.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:16:17.188Z'), updatedAt: new Date('2026-01-22T13:22:19.859Z') },
      { id: 19, name: 'Sandpaper 240', quantity: 14.00, unitCost: 3.10, sellingPrice: 5.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:16:43.892Z'), updatedAt: new Date('2026-01-22T13:17:07.485Z') },
      { id: 20, name: 'Sandpaper p60', quantity: 24.00, unitCost: 7.80, sellingPrice: 10.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:17:14.699Z'), updatedAt: new Date('2026-01-20T21:17:14.699Z') },
      { id: 21, name: 'Sandpaper p80', quantity: 0.00, unitCost: 7.80, sellingPrice: 10.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-20T21:17:47.735Z'), updatedAt: new Date('2026-01-20T21:17:47.735Z') },
      { id: 22, name: 'Sandpaper 120', quantity: 6.00, unitCost: 7.80, sellingPrice: 10.00, lowStockThreshold: 2.00, isActive: true, createdAt: new Date('2026-01-20T21:18:32.536Z'), updatedAt: new Date('2026-01-20T21:18:32.536Z') },
      { id: 23, name: 'Tape', quantity: 6.00, unitCost: 12.50, sellingPrice: 15.00, lowStockThreshold: 10.00, isActive: true, createdAt: new Date('2026-01-21T07:20:39.505Z'), updatedAt: new Date('2026-01-22T13:22:19.854Z') }
    ]
  });

  console.log('🚗 Creating services...');
  await prisma.service.createMany({
    data: [
      { id: 1, type: 'booth', name: 'Full Body', category: '4x4', price: 140.00, isActive: true, createdAt: new Date('2026-01-21T13:27:18.427Z'), updatedAt: new Date('2026-01-21T13:27:18.427Z') },
      { id: 2, type: 'booth', name: 'Touches Inside Booth', category: 'Saloon', price: 80.00, isActive: true, createdAt: new Date('2026-01-21T13:32:05.46Z'), updatedAt: new Date('2026-01-21T13:32:05.46Z') },
      { id: 3, type: 'booth', name: 'Full body', category: 'Saloon', price: 120.00, isActive: true, createdAt: new Date('2026-01-22T10:39:50.121Z'), updatedAt: new Date('2026-01-22T10:39:50.121Z') },
      { id: 4, type: 'booth', name: 'Touches', category: 'Saloon small', price: 50.00, isActive: true, createdAt: new Date('2026-01-22T10:40:13.609Z'), updatedAt: new Date('2026-01-22T10:40:13.609Z') }
    ]
  });

 

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
