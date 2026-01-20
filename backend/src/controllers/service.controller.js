// backend/src/controllers/serviceController.js
import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all booth services
// @route   GET /api/services/booth
// @access  Private
export const getBoothServices = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const where = { type: 'booth' };

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services,
  });
});

// @desc    Get single booth service
// @route   GET /api/services/booth/:id
// @access  Private
export const getBoothService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(id) },
  });

  if (!service || service.type !== 'booth') {
    throw new AppError('Booth service not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: service,
  });
});

// @desc    Create booth service
// @route   POST /api/services/booth
// @access  Private (Admin only)
export const createBoothService = asyncHandler(async (req, res) => {
  const { name, category, price } = req.body;

  // Validation
  if (!name || !category || !price) {
    throw new AppError(
      'Please provide name, category, and price',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (price <= 0) {
    throw new AppError(
      'Price must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check if service with same name exists
  const existingService = await prisma.service.findFirst({
    where: {
      type: 'booth',
      name: name.trim(),
    },
  });

  if (existingService) {
    throw new AppError(
      'A booth service with this name already exists',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  // Create service
  const service = await prisma.service.create({
    data: {
      type: 'booth',
      name: name.trim(),
      category: category.trim(),
      price: parseFloat(price),
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Service',
      entityId: service.id,
      description: `Created booth service: ${service.name} (${service.category}) - GH₵${service.price}`,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Booth service created successfully',
    data: service,
  });
});

// @desc    Update booth service
// @route   PUT /api/services/booth/:id
// @access  Private (Admin only)
export const updateBoothService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, price, isActive } = req.body;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(id) },
  });

  if (!service || service.type !== 'booth') {
    throw new AppError('Booth service not found', 404, 'NOT_FOUND');
  }

  // Build update data
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (category !== undefined) updateData.category = category.trim();
  if (price !== undefined) {
    if (parseFloat(price) <= 0) {
      throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
    }
    updateData.price = parseFloat(price);
  }
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  // Check for duplicate name if name is being changed
  if (name && name.trim() !== service.name) {
    const existingService = await prisma.service.findFirst({
      where: {
        type: 'booth',
        name: name.trim(),
        id: { not: parseInt(id) },
      },
    });

    if (existingService) {
      throw new AppError(
        'A booth service with this name already exists',
        400,
        'DUPLICATE_ENTRY'
      );
    }
  }

  // Update service
  const updatedService = await prisma.service.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Service',
      entityId: updatedService.id,
      description: `Updated booth service: ${updatedService.name}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Booth service updated successfully',
    data: updatedService,
  });
});

// @desc    Delete booth service
// @route   DELETE /api/services/booth/:id
// @access  Private (Admin only)
export const deleteBoothService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(id) },
    include: {
      _count: {
        select: {
          saleItems: true,
        },
      },
    },
  });

  if (!service || service.type !== 'booth') {
    throw new AppError('Booth service not found', 404, 'NOT_FOUND');
  }

  // Check if service has been used in sales
  if (service._count.saleItems > 0) {
    // Soft delete - deactivate instead
    const deactivatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE',
        entity: 'Service',
        entityId: deactivatedService.id,
        description: `Deactivated booth service with sales history: ${deactivatedService.name}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Booth service deactivated (has sales history)',
      data: deactivatedService,
    });
  }

  // Hard delete if no sales history
  await prisma.service.delete({
    where: { id: parseInt(id) },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Service',
      entityId: parseInt(id),
      description: `Deleted booth service: ${service.name}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Booth service deleted successfully',
  });
});

// @desc    Toggle booth service status
// @route   PUT /api/services/booth/:id/toggle
// @access  Private (Admin only)
export const toggleBoothService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await prisma.service.findUnique({
    where: { id: parseInt(id) },
  });

  if (!service || service.type !== 'booth') {
    throw new AppError('Booth service not found', 404, 'NOT_FOUND');
  }

  const updatedService = await prisma.service.update({
    where: { id: parseInt(id) },
    data: { isActive: !service.isActive },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Service',
      entityId: updatedService.id,
      description: `${updatedService.isActive ? 'Activated' : 'Deactivated'} booth service: ${updatedService.name}`,
    },
  });

  res.status(200).json({
    success: true,
    message: `Booth service ${updatedService.isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedService,
  });
});

// @desc    Get booth service statistics
// @route   GET /api/services/booth/stats
// @access  Private
export const getBoothServiceStats = asyncHandler(async (req, res) => {
  const [totalServices, activeServices, servicesByCategory] = await Promise.all([
    // Total services
    prisma.service.count({
      where: { type: 'booth' },
    }),

    // Active services
    prisma.service.count({
      where: { type: 'booth', isActive: true },
    }),

    // Services by category
    prisma.service.groupBy({
      by: ['category'],
      where: { type: 'booth' },
      _count: true,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalServices,
      activeServices,
      inactiveServices: totalServices - activeServices,
      servicesByCategory,
    },
  });
});