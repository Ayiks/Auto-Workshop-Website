/**
 * sandboxSeeder.js
 * Generates realistic dummy data for a sandbox/demo workspace.
 * Called once after the sandbox business + admin user are created.
 */

import { getTenantDB } from '../config/database.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dp = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));

/** Returns a Date object N days ago from now */
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ---------------------------------------------------------------------------
// Static fixture data
// ---------------------------------------------------------------------------
const VEHICLE_MAKES = ['Toyota', 'Honda', 'Hyundai', 'Ford', 'Kia', 'Nissan', 'Mercedes', 'BMW', 'Volkswagen', 'Mitsubishi'];
const VEHICLE_MODELS = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'HiLux', 'Land Cruiser'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe', 'i10', 'i20'],
  Ford: ['Focus', 'Ranger', 'Explorer', 'EcoSport', 'F-150'],
  Kia: ['Sportage', 'Sorento', 'Picanto', 'Cerato', 'Stinger'],
  Nissan: ['Almera', 'X-Trail', 'Pathfinder', 'Navara', 'Micra'],
  Mercedes: ['C-Class', 'E-Class', 'GLC', 'A-Class', 'GLE'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5', '1 Series'],
  Volkswagen: ['Golf', 'Polo', 'Passat', 'Tiguan', 'Jetta'],
  Mitsubishi: ['Outlander', 'Pajero', 'Eclipse Cross', 'L200', 'Galant'],
};
const REG_PREFIXES = ['GR', 'AS', 'BA', 'BE', 'WR', 'UW', 'AE', 'NP'];

const CLIENTS = [
  { name: 'Kwame Asante', phone: '+233241000001' },
  { name: 'Abena Mensah', phone: '+233241000002' },
  { name: 'Kofi Boateng', phone: '+233241000003' },
  { name: 'Ama Owusu', phone: '+233241000004' },
  { name: 'Yaw Darko', phone: '+233241000005' },
  { name: 'Akosua Amponsah', phone: '+233241000006' },
  { name: 'Kweku Frimpong', phone: '+233241000007' },
  { name: 'Adwoa Sarpong', phone: '+233241000008' },
  { name: 'Kojo Acheampong', phone: '+233241000009' },
  { name: 'Efua Amoah', phone: '+233241000010' },
  { name: 'Nana Adjei', phone: '+233241000011' },
  { name: 'Serwaa Bonsu', phone: '+233241000012' },
];

const PROBLEM_TYPES = {
  mechanic: ['Engine Repair', 'Brake Service', 'Oil Change', 'Transmission Service', 'Suspension Repair', 'Electrical Fault', 'AC Service', 'Tyre Change'],
  sprayer: ['Full Body Respray', 'Panel Respray', 'Touch Up', 'Primer & Paint', 'Clear Coat', 'Scratch Removal'],
  bodyworks: ['Dent Removal', 'Panel Beating', 'Bumper Repair', 'Frame Straightening', 'Rust Treatment', 'Welding'],
};

const MATERIAL_CATALOGUE = [
  { name: 'Engine Oil 5W-30 (4L)', unitCost: 85, sellingPrice: 120, unit: 'can', threshold: 5 },
  { name: 'Oil Filter', unitCost: 25, sellingPrice: 40, unit: 'piece', threshold: 10 },
  { name: 'Air Filter', unitCost: 30, sellingPrice: 50, unit: 'piece', threshold: 8 },
  { name: 'Brake Pads (Set)', unitCost: 110, sellingPrice: 160, unit: 'set', threshold: 5 },
  { name: 'Brake Fluid (500ml)', unitCost: 22, sellingPrice: 35, unit: 'bottle', threshold: 6 },
  { name: 'Spark Plugs (x4)', unitCost: 55, sellingPrice: 80, unit: 'set', threshold: 8 },
  { name: 'Coolant (1L)', unitCost: 18, sellingPrice: 30, unit: 'bottle', threshold: 10 },
  { name: 'Power Steering Fluid', unitCost: 20, sellingPrice: 35, unit: 'bottle', threshold: 6 },
  { name: 'Transmission Fluid (1L)', unitCost: 45, sellingPrice: 70, unit: 'bottle', threshold: 6 },
  { name: 'Wiper Blades (Pair)', unitCost: 35, sellingPrice: 55, unit: 'pair', threshold: 5 },
  { name: 'Car Battery (60Ah)', unitCost: 380, sellingPrice: 520, unit: 'piece', threshold: 3 },
  { name: 'Alternator Belt', unitCost: 40, sellingPrice: 65, unit: 'piece', threshold: 5 },
  { name: 'Radiator Hose', unitCost: 55, sellingPrice: 85, unit: 'piece', threshold: 4 },
  { name: 'Primer (1L)', unitCost: 45, sellingPrice: 70, unit: 'litre', threshold: 5 },
  { name: 'Automotive Paint (1L)', unitCost: 95, sellingPrice: 150, unit: 'litre', threshold: 5 },
  { name: 'Clear Lacquer (1L)', unitCost: 60, sellingPrice: 90, unit: 'litre', threshold: 5 },
  { name: 'Body Filler (1kg)', unitCost: 35, sellingPrice: 55, unit: 'tin', threshold: 4 },
  { name: 'Sandpaper (Pack)', unitCost: 15, sellingPrice: 25, unit: 'pack', threshold: 10 },
  { name: 'Masking Tape', unitCost: 8, sellingPrice: 15, unit: 'roll', threshold: 10 },
  { name: 'Welding Rod (Pack)', unitCost: 45, sellingPrice: 70, unit: 'pack', threshold: 5 },
];

const BOOTH_SERVICES = [
  { serviceCategory: 'Full Body', itemCategory: '4x4 / SUV', price: 2500 },
  { serviceCategory: 'Full Body', itemCategory: 'Saloon', price: 1800 },
  { serviceCategory: 'Full Body', itemCategory: 'Mini / Hatchback', price: 1400 },
  { serviceCategory: 'Touch Up', itemCategory: '4x4 / SUV', price: 800 },
  { serviceCategory: 'Touch Up', itemCategory: 'Saloon', price: 600 },
  { serviceCategory: 'Touch Up', itemCategory: 'Mini / Hatchback', price: 450 },
  { serviceCategory: 'Panel Respray', itemCategory: 'Bonnet', price: 350 },
  { serviceCategory: 'Panel Respray', itemCategory: 'Door', price: 280 },
  { serviceCategory: 'Panel Respray', itemCategory: 'Bumper', price: 220 },
  { serviceCategory: 'Panel Respray', itemCategory: 'Roof', price: 400 },
];

const EXPENSE_CATEGORIES = [
  { type: 'operational', category: 'utilities', description: 'Monthly electricity bill', amount: 450 },
  { type: 'operational', category: 'utilities', description: 'Water bill', amount: 80 },
  { type: 'operational', category: 'rent', description: 'Workshop rent', amount: 2200 },
  { type: 'operational', category: 'salaries', description: 'Staff salary - Mechanic', amount: 1800 },
  { type: 'operational', category: 'salaries', description: 'Staff salary - Sprayer', amount: 1600 },
  { type: 'operational', category: 'supplies', description: 'Cleaning supplies', amount: 120 },
  { type: 'operational', category: 'maintenance', description: 'Equipment maintenance', amount: 350 },
  { type: 'operational', category: 'fuel', description: 'Generator fuel', amount: 200 },
];

// ---------------------------------------------------------------------------
// Main seeder function
// ---------------------------------------------------------------------------
export async function seedSandbox(businessId, adminUserId) {
  const db = getTenantDB(businessId);

  // 1. Business Settings
  await db.businessSettings.create({
    data: {
      name: 'Demo Auto Workshop',
      address: 'Spintex Road, Accra, Greater Accra',
      phone: '+233 24 000 9999',
      email: 'demo@autoworkshop.gh',
      website: 'https://www.demoworkshop.gh',
      businessId,
    },
  });

  // 2. Staff Users
  const bcrypt = await import('bcryptjs');
  const demoPassword = await bcrypt.default.hash('Demo@1234', 12);

  const [mechUser, sprayerUser, salesUser, bodyworksUser] = await Promise.all([
    db.user.create({
      data: {
        username: `mechanic_${businessId.slice(0, 6)}`,
        passwordHash: demoPassword,
        fullName: 'Kwame Mensah',
        email: 'kwame@demo.gh',
        phone: '+233201111001',
        role: 'mechanic',
        businessId,
        isEmailVerified: true,
        permissions: { jobs: ['view', 'create', 'edit'] },
      },
    }),
    db.user.create({
      data: {
        username: `sprayer_${businessId.slice(0, 6)}`,
        passwordHash: demoPassword,
        fullName: 'Kofi Adu',
        email: 'kofi@demo.gh',
        phone: '+233201111002',
        role: 'sprayer',
        businessId,
        isEmailVerified: true,
        permissions: { jobs: ['view', 'create', 'edit'] },
      },
    }),
    db.user.create({
      data: {
        username: `sales_${businessId.slice(0, 6)}`,
        passwordHash: demoPassword,
        fullName: 'Akosua Frimpong',
        email: 'akosua@demo.gh',
        phone: '+233201111003',
        role: 'sales',
        businessId,
        isEmailVerified: true,
        permissions: { sales: ['view', 'create'], materials: ['view'] },
      },
    }),
    db.user.create({
      data: {
        username: `bodyworks_${businessId.slice(0, 6)}`,
        passwordHash: demoPassword,
        fullName: 'Yaw Boateng',
        email: 'yaw@demo.gh',
        phone: '+233201111004',
        role: 'bodyworks',
        businessId,
        isEmailVerified: true,
        permissions: { jobs: ['view', 'create', 'edit'] },
      },
    }),
  ]);

  // 3. Global Units
  const unitData = [
    { name: 'Piece', abbreviation: 'pcs' },
    { name: 'Litre', abbreviation: 'L' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Set', abbreviation: 'set' },
    { name: 'Pack', abbreviation: 'pk' },
    { name: 'Bottle', abbreviation: 'btl' },
    { name: 'Can', abbreviation: 'can' },
    { name: 'Roll', abbreviation: 'roll' },
    { name: 'Pair', abbreviation: 'pr' },
    { name: 'Tin', abbreviation: 'tin' },
  ];

  const units = await Promise.all(
    unitData.map((u) => db.globalUnit.create({ data: { ...u, businessId } }))
  );
  const unitMap = Object.fromEntries(units.map((u) => [u.name.toLowerCase(), u]));

  // 4. Materials (Inventory)
  const getUnitId = (unitName) => {
    const key = unitName.toLowerCase();
    return unitMap[key]?.id || unitMap['piece']?.id || null;
  };

  const materials = await Promise.all(
    MATERIAL_CATALOGUE.map((m) =>
      db.material.create({
        data: {
          name: m.name,
          unitCost: m.unitCost,
          sellingPrice: m.sellingPrice,
          quantity: randInt(10, 60),
          lowStockThreshold: m.threshold,
          baseUnit: m.unit,
          materialUnitId: getUnitId(m.unit),
          businessId,
        },
      })
    )
  );

  // 5. Booth Services
  await Promise.all(
    BOOTH_SERVICES.map((s) =>
      db.service.create({
        data: {
          type: 'booth',
          name: s.serviceCategory,
          category: s.itemCategory,
          price: s.price,
          businessId,
        },
      })
    )
  );

  // 6. Customers
  const customers = await Promise.all(
    CLIENTS.map((c) =>
      db.customer.create({
        data: {
          firstName: c.name.split(' ')[0],
          lastName: c.name.split(' ')[1] || null,
          phone: c.phone,
          businessId,
        },
      })
    )
  );

  // ---------------------------------------------------------------------------
  // 7. Jobs — spread across past 30 days
  // ---------------------------------------------------------------------------
  const jobAssignees = {
    mechanic: mechUser.id,
    sprayer: sprayerUser.id,
    bodyworks: bodyworksUser.id,
  };

  const jobTypes = ['mechanic', 'mechanic', 'mechanic', 'sprayer', 'sprayer', 'bodyworks']; // weighted
  const jobStatuses = ['pending', 'in_progress', 'completed', 'completed', 'completed']; // mostly completed

  const createdJobs = [];

  for (let i = 0; i < 24; i++) {
    const jobType = rand(jobTypes);
    const status = rand(jobStatuses);
    const client = rand(CLIENTS);
    const make = rand(VEHICLE_MAKES);
    const model = rand(VEHICLE_MODELS[make]);
    const labourCost = randFloat(150, 1200);
    const dayOffset = randInt(0, 29);

    // pick 1-3 random materials for this job
    const jobMaterialsData = [];
    const numMats = randInt(1, 3);
    const usedMats = new Set();

    for (let m = 0; m < numMats; m++) {
      let mat;
      let attempts = 0;
      do {
        mat = rand(materials);
        attempts++;
      } while (usedMats.has(mat.id) && attempts < 10);

      if (!usedMats.has(mat.id)) {
        usedMats.add(mat.id);
        const qty = randInt(1, 3);
        jobMaterialsData.push({
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unitPrice: parseFloat(mat.sellingPrice),
          subtotal: parseFloat(mat.sellingPrice) * qty,
          isExternal: false,
          businessId,
        });
      }
    }

    const materialsCost = jobMaterialsData.reduce((sum, m) => sum + m.subtotal, 0);
    const totalCost = labourCost + materialsCost;
    const createdAt = daysAgo(dayOffset);

    const job = await db.job.create({
      data: {
        jobType,
        clientName: client.name,
        clientPhone: client.phone,
        vehicleMake: make,
        vehicleModel: model,
        vehicleRegNumber: `${rand(REG_PREFIXES)}-${randInt(1000, 9999)}-${rand(['A', 'B', 'C', 'D', 'E', 'G', 'H', 'J', 'K'])}`,
        problemType: rand(PROBLEM_TYPES[jobType]),
        problemDescription: `Customer reported ${rand(PROBLEM_TYPES[jobType]).toLowerCase()} issues. Full inspection and service required.`,
        labourCost,
        totalCost,
        assignedTo: jobAssignees[jobType],
        status: status === 'completed' ? 'completed' : status,
        createdAt,
        updatedAt: createdAt,
        businessId,
        materials: {
          create: jobMaterialsData,
        },
      },
    });

    createdJobs.push({ job, materialsCost, labourCost, totalCost, status });
  }

  // ---------------------------------------------------------------------------
  // 8. Invoices + Payments for completed jobs
  // ---------------------------------------------------------------------------
  let invoiceSeq = 1000;

  for (const { job, materialsCost, labourCost, totalCost, status } of createdJobs) {
    if (status !== 'completed') continue;

    const invoiceNumber = `INV-DEMO-${invoiceSeq++}`;
    const paymentStatus = rand(['paid', 'paid', 'paid', 'partial', 'unpaid']);
    const amountPaid =
      paymentStatus === 'paid'
        ? totalCost
        : paymentStatus === 'partial'
        ? parseFloat((totalCost * randFloat(0.3, 0.7)).toFixed(2))
        : 0;
    const amountDue = parseFloat((totalCost - amountPaid).toFixed(2));

    const invoice = await db.invoice.create({
      data: {
        jobId: job.id,
        invoiceNumber,
        materialsCost,
        labourCost,
        totalAmount: totalCost,
        amountPaid,
        amountDue,
        paymentStatus,
        invoiceDate: job.createdAt,
        fullyPaidDate: paymentStatus === 'paid' ? job.createdAt : null,
        businessId,
      },
    });

    // Update job status to 'invoiced'
    await db.job.update({ where: { id: job.id }, data: { status: 'invoiced' } });

    // Create payment record if any amount was paid
    if (amountPaid > 0) {
      const payment = await db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: amountPaid,
          paymentMethod: rand(['cash', 'momo', 'card', 'bank_transfer']),
          paymentDate: job.createdAt,
          receivedBy: adminUserId,
          businessId,
        },
      });

      // Create receipt for the payment
      await db.receipt.create({
        data: {
          receiptNumber: `RCP-DEMO-${invoiceSeq}`,
          receiptType: 'payment',
          paymentId: payment.id,
          amount: amountPaid,
          paymentMethod: payment.paymentMethod,
          issuedBy: adminUserId,
          issuedDate: job.createdAt,
          businessName: 'Demo Auto Workshop',
          businessAddress: 'Spintex Road, Accra, Greater Accra',
          businessContact: '+233 24 000 9999',
          businessId,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Counter Sales (last 30 days)
  // ---------------------------------------------------------------------------
  const allSellers = [adminUserId, salesUser.id];

  for (let i = 0; i < 20; i++) {
    const saleDate = daysAgo(randInt(0, 29));
    const seller = rand(allSellers);
    const customer = rand(customers);
    const numItems = randInt(1, 3);

    const saleItemsData = [];
    const usedMats = new Set();

    // Randomly pick material or booth item
    for (let s = 0; s < numItems; s++) {
      const isBooth = Math.random() > 0.7; // 30% booth sales

      if (isBooth) {
        const boothService = rand(BOOTH_SERVICES);
        saleItemsData.push({
          itemType: 'booth',
          materialName: `${boothService.serviceCategory} - ${boothService.itemCategory}`,
          quantity: 1,
          unitPrice: boothService.price,
          subtotal: boothService.price,
          unitCost: 0,
          businessId,
        });
      } else {
        let mat;
        let attempts = 0;
        do { mat = rand(materials); attempts++; } while (usedMats.has(mat.id) && attempts < 10);
        if (usedMats.has(mat.id)) continue;

        usedMats.add(mat.id);
        const qty = randInt(1, 4);
        const price = parseFloat(mat.sellingPrice);
        saleItemsData.push({
          itemType: 'material',
          materialId: mat.id,
          materialName: mat.name,
          quantity: qty,
          unitPrice: price,
          subtotal: price * qty,
          unitCost: parseFloat(mat.unitCost),
          businessId,
        });
      }
    }

    if (saleItemsData.length === 0) continue;

    const totalAmount = saleItemsData.reduce((s, i) => s + i.subtotal, 0);
    const paymentStatus = rand(['paid', 'paid', 'paid', 'partial']);
    const amountPaid = paymentStatus === 'paid' ? totalAmount : parseFloat((totalAmount * 0.5).toFixed(2));
    const balance = parseFloat((totalAmount - amountPaid).toFixed(2));
    const paymentMethod = rand(['cash', 'momo', 'card']);

    const sale = await db.sale.create({
      data: {
        saleDate,
        totalAmount,
        paymentMethod,
        soldBy: seller,
        status: 'completed',
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        paymentStatus,
        amountPaid,
        balance,
        businessId,
        items: { create: saleItemsData },
      },
    });

    // Receipt for the sale
    await db.receipt.create({
      data: {
        receiptNumber: `RCP-SALE-${sale.id}-${businessId.slice(0, 4)}`,
        receiptType: 'sale',
        saleId: sale.id,
        amount: amountPaid,
        paymentMethod,
        issuedBy: seller,
        issuedDate: saleDate,
        businessName: 'Demo Auto Workshop',
        businessAddress: 'Spintex Road, Accra, Greater Accra',
        businessContact: '+233 24 000 9999',
        businessId,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Expenses (last 30 days)
  // ---------------------------------------------------------------------------
  for (const exp of EXPENSE_CATEGORIES) {
    await db.expense.create({
      data: {
        type: exp.type,
        category: exp.category,
        description: exp.description,
        amount: exp.amount + randInt(-20, 20), // slight variation
        expenseDate: daysAgo(randInt(1, 28)),
        source: 'manual',
        isReadOnly: false,
        recordedBy: adminUserId,
        businessId,
      },
    });
  }

  // Add a few material purchase (COGS) expenses
  for (let i = 0; i < 4; i++) {
    const mat = rand(materials);
    const qty = randInt(5, 20);
    const unitCost = parseFloat(mat.unitCost);
    const total = qty * unitCost;

    await db.expense.create({
      data: {
        type: 'operational',
        category: 'materials',
        description: `Stock purchase: ${mat.name} (x${qty})`,
        amount: total,
        expenseDate: daysAgo(randInt(1, 28)),
        source: 'manual',
        isReadOnly: false,
        recordedBy: adminUserId,
        businessId,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Bookings (upcoming appointments)
  // ---------------------------------------------------------------------------
  const upcomingClients = CLIENTS.slice(0, 5);
  for (let i = 0; i < upcomingClients.length; i++) {
    const client = upcomingClients[i];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + randInt(1, 14));

    await db.booking.create({
      data: {
        bookingType: rand(['service_inquiry', 'booth']),
        clientName: client.name,
        clientPhone: client.phone,
        serviceType: rand(['Oil Change', 'Full Body Respray', 'Brake Service', 'Dent Removal', 'AC Service']),
        preferredDate: futureDate,
        preferredTime: rand(['08:00', '09:00', '10:00', '11:00', '14:00', '15:00']),
        message: 'Demo booking — please confirm availability.',
        status: rand(['new', 'new', 'confirmed']),
        businessId,
      },
    });
  }

  return {
    usersCreated: 4,
    materialsCreated: materials.length,
    jobsCreated: createdJobs.length,
    salesCreated: 20,
    expensesCreated: EXPENSE_CATEGORIES.length + 4,
    bookingsCreated: upcomingClients.length,
  };
}