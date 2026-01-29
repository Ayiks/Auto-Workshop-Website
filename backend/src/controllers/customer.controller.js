import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all customers (with optional search)
// @route   GET /api/customers
// @access  Private
export const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;

  // Build search filter
  const whereClause = {
    isActive: true, // Only fetch active customers
    ...(search && {
      OR: [
        { firstName: { contains: search } }, 
        { lastName: { contains: search } }, 
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    }),
  };

  const customers = await prisma.customer.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { 
      id: parseInt(id),
      isActive: true 
    },
    // Include relations here later if needed (e.g., invoices)
    // include: { invoices: true } 
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
  const { firstName, lastName, phone, email, address, notes } = req.body;

  // Basic Validation
  if (!firstName || !phone) {
    throw new AppError('First name and phone number are required', 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate phone number
  // (Prisma would catch this with P2002, but a custom message is sometimes nicer)
  const existingCustomer = await prisma.customer.findFirst({
    where: { phone }
  });

  if (existingCustomer) {
    // If they exist but were soft-deleted, we might want to reactivate them?
    // For now, just throw duplicate error
    throw new AppError('Customer with this phone number already exists', 400, 'DUPLICATE_ENTRY');
  }

  const customer = await prisma.customer.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      address,
      notes,
    },
  });

  // Optional: Audit Log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      description: `Created customer ${firstName} ${lastName || ''}`,
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
  const { firstName, lastName, phone, email, address, notes } = req.body;

  // We rely on Prisma's P2025 error (Record not found) which your middleware handles,
  // or P2002 (Unique constraint) if phone is duplicated.
  
  const customer = await prisma.customer.update({
    where: { id: parseInt(id) },
    data: {
      firstName,
      lastName,
      phone,
      email,
      address,
      notes,
    },
  });

  // Optional: Audit Log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: customer.id,
      description: `Updated customer ${customer.firstName}`,
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

  // Check if customer exists first
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(id) }
  });

  if (!customer) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  // Perform Soft Delete
  await prisma.customer.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Customer',
      entityId: parseInt(id),
      description: `Soft deleted customer ${customer.firstName} ${customer.lastName || ''}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Customer removed successfully',
  });
});