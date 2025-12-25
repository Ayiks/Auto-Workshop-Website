import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // Create users
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin',
      fullName: 'System Administrator',
      isActive: true,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { username: 'sales' },
    update: {},
    create: {
      username: 'sales',
      passwordHash: await bcrypt.hash('sales123', 12),
      role: 'sales',
      fullName: 'Sales User',
      isActive: true,
    },
  });

  const mechanic = await prisma.user.upsert({
    where: { username: 'mechanic' },
    update: {},
    create: {
      username: 'mechanic',
      passwordHash: await bcrypt.hash('mechanic123', 12),
      role: 'mechanic',
      fullName: 'Mechanic User',
      isActive: true,
    },
  });

  console.log('✅ Users created:', { admin, salesUser, mechanic });

  // Create sample materials
  const materials = [
    {
      name: 'Engine Oil 5W-30',
      costPrice: 45.00,
      sellingPrice: 65.00,
      quantity: 50,
      lowStockLevel: 10,
      createdById: admin.id,
    },
    {
      name: 'Air Filter',
      costPrice: 15.00,
      sellingPrice: 25.00,
      quantity: 30,
      lowStockLevel: 5,
      createdById: admin.id,
    },
    {
      name: 'Brake Pads',
      costPrice: 80.00,
      sellingPrice: 120.00,
      quantity: 20,
      lowStockLevel: 5,
      createdById: admin.id,
    },
    {
      name: 'Spark Plugs (Set of 4)',
      costPrice: 30.00,
      sellingPrice: 50.00,
      quantity: 25,
      lowStockLevel: 8,
      createdById: admin.id,
    },
    {
      name: 'Battery 12V',
      costPrice: 120.00,
      sellingPrice: 180.00,
      quantity: 15,
      lowStockLevel: 3,
      createdById: admin.id,
    },
    {
      name: 'Windshield Wipers',
      costPrice: 20.00,
      sellingPrice: 35.00,
      quantity: 40,
      lowStockLevel: 10,
      createdById: admin.id,
    },
    {
      name: 'Coolant Fluid (1L)',
      costPrice: 12.00,
      sellingPrice: 20.00,
      quantity: 60,
      lowStockLevel: 15,
      createdById: admin.id,
    },
    {
      name: 'Transmission Fluid',
      costPrice: 35.00,
      sellingPrice: 55.00,
      quantity: 25,
      lowStockLevel: 8,
      createdById: admin.id,
    },
  ];

  // Check if materials already exist
  const existingMaterials = await prisma.material.count();
  
  if (existingMaterials === 0) {
    await prisma.material.createMany({
      data: materials,
    });
    console.log('✅ Materials created:', materials.length);
  } else {
    console.log('ℹ️  Materials already exist, skipping creation');
  }

  // Create sample booking
  const existingBookings = await prisma.booking.count();
  
  if (existingBookings === 0) {
    await prisma.booking.create({
      data: {
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        clientPhone: '+233241234567',
        serviceType: 'General Service',
        preferredDate: new Date('2025-12-28'),
        message: 'Need a full service for my Toyota Corolla',
        status: 'new',
      },
    });
    console.log('✅ Sample booking created');
  } else {
    console.log('ℹ️  Bookings already exist, skipping creation');
  }

  console.log('🎉 Database seeded successfully!');
  console.log('\n📝 Default login credentials:');
  console.log('Admin: username=admin, password=admin123');
  console.log('Sales: username=sales, password=sales123');
  console.log('Mechanic: username=mechanic, password=mechanic123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });