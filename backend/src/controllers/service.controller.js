import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get booth service
// @route   GET /api/services/booth
// @access  Private (requires 'booth:view' permission)
export const getBoothService = asyncHandler(async (req, res) => {
  // There should only be one booth service
  const service = await prisma.service.findFirst({
    where: { type: 'booth' },
  });

  if (!service) {
    throw new AppError('Booth service not configured', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: service,
  });
});

// @desc    Update booth service price
// @route   PUT /api/services/booth
// @access  Private (requires 'booth:edit' permission)
export const updateBoothServicePrice = asyncHandler(async (req, res) => {
  const { price } = req.body;

  if (!price || price <= 0) {
    throw new AppError(
      'Please provide a valid price greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Find existing booth service
  let service = await prisma.service.findFirst({
    where: { type: 'booth' },
  });

  if (!service) {
    // Create if doesn't exist
    service = await prisma.service.create({
      data: {
        type: 'booth',
        price: parseFloat(price),
      },
    });
  } else {
    // Update existing
    service = await prisma.service.update({
      where: { id: service.id },
      data: {
        price: parseFloat(price),
      },
    });
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Service',
      entityId: service.id,
      description: `Updated booth service price to GH₵${price}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Booth service price updated successfully',
    data: service,
  });
});