import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all customers (with optional search)
// @route   GET /api/customers
// @access  Private
export const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const whereClause = {
    isActive: true,
    businessId: req.user.businessId, // scope to tenant
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const customers = await req.db.customer.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      vehicles: {
        where: { isActive: true },
        select: { id: true, make: true, model: true, year: true, regNumber: true },
      },
      jobs: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { jobs: true } },
    },
  });

  const data = customers.map(c => ({
    ...c,
    isProfileComplete: c.vehicles.length > 0,
    jobCount: c._count.jobs,
    lastVisit: c.jobs[0]?.createdAt || null,
    _count: undefined,
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await req.db.customer.findFirst({
    where: {
      id: parseInt(id),
      isActive: true,
      businessId: req.user.businessId, // prevent cross-tenant access
    },
    include: { vehicles: { where: { isActive: true }, orderBy: { createdAt: 'desc' } } },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: customer,
  });
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email, address, notes, preferredContact } = req.body;

  if (!firstName || !phone) {
    throw new AppError('First name and phone number are required', 400, 'VALIDATION_ERROR');
  }

  // duplicate check is now scoped to this business only
  const existingCustomer = await req.db.customer.findFirst({
    where: { phone, businessId: req.user.businessId },
  });

  if (existingCustomer) {
    throw new AppError('Customer with this phone number already exists', 400, 'DUPLICATE_ENTRY');
  }

  // businessId explicitly written on create
  const customer = await req.db.customer.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      address,
      notes,
      preferredContact: preferredContact || null,
      businessId: req.user.businessId,
    },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      description: `Created customer ${firstName} ${lastName || ''}`,
      businessId: req.user.businessId,
    },
  });

  res.status(201).json({
    success: true,
    data: customer,
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, email, address, notes, preferredContact } = req.body;

  // verify ownership before updating
  const existing = await req.db.customer.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });

  if (!existing) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  // if phone is changing, check for duplicates within this business only
  if (phone && phone !== existing.phone) {
    const phoneConflict = await req.db.customer.findFirst({
      where: {
        phone,
        businessId: req.user.businessId,
        id: { not: parseInt(id) },
      },
    });
    if (phoneConflict) {
      throw new AppError('Another customer with this phone number already exists', 400, 'DUPLICATE_ENTRY');
    }
  }

  const customer = await req.db.customer.update({
    where: { id: parseInt(id) },
    data: { firstName, lastName, phone, email, address, notes, preferredContact: preferredContact ?? undefined },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: customer.id,
      description: `Updated customer ${customer.firstName}`,
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({
    success: true,
    data: customer,
  });
});

// @desc    Delete customer (Soft delete)
// @route   DELETE /api/customers/:id
// @access  Private (Admin only recommended)
export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // verify ownership before deleting
  const customer = await req.db.customer.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  await req.db.customer.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Customer',
      entityId: parseInt(id),
      description: `Soft deleted customer ${customer.firstName} ${customer.lastName || ''}`,
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Customer removed successfully',
  });
});