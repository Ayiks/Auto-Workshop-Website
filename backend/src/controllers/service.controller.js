// // backend/src/controllers/serviceController.js
// import prisma from '../config/database.js';
// import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// // @desc    Get all booth services
// // @route   GET /api/services/booth
// // @access  Private
// export const getBoothServices = asyncHandler(async (req, res) => {
//   const { isActive } = req.query;

//   const where = { type: 'booth' };

//   if (isActive !== undefined) {
//     where.isActive = isActive === 'true';
//   }

//   const services = await prisma.service.findMany({
//     where,
//     orderBy: { name: 'asc' },
//   });

//   res.status(200).json({
//     success: true,
//     count: services.length,
//     data: services,
//   });
// });

// // @desc    Get single booth service
// // @route   GET /api/services/booth/:id
// // @access  Private
// export const getBoothService = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const service = await prisma.service.findUnique({
//     where: { id: parseInt(id) },
//   });

//   if (!service || service.type !== 'booth') {
//     throw new AppError('Booth service not found', 404, 'NOT_FOUND');
//   }

//   res.status(200).json({
//     success: true,
//     data: service,
//   });
// });

// // @desc    Create booth service
// // @route   POST /api/services/booth
// // @access  Private (Admin only)
// export const createBoothService = asyncHandler(async (req, res) => {
//   const { name, category, price } = req.body;

//   // Validation
//   if (!name || !category || !price) {
//     throw new AppError(
//       'Please provide name, category, and price',
//       400,
//       'VALIDATION_ERROR'
//     );
//   }

//   if (price <= 0) {
//     throw new AppError(
//       'Price must be greater than 0',
//       400,
//       'VALIDATION_ERROR'
//     );
//   }

//   // Check if service with same name exists
//   const existingService = await prisma.service.findFirst({
//     where: {
//       type: 'booth',
//       name: name.trim(),
//     },
//   });

//   if (existingService) {
//     throw new AppError(
//       'A booth service with this name already exists',
//       400,
//       'DUPLICATE_ENTRY'
//     );
//   }

//   // Create service
//   const service = await prisma.service.create({
//     data: {
//       type: 'booth',
//       name: name.trim(),
//       category: category.trim(),
//       price: parseFloat(price),
//     },
//   });

//   // Log audit
//   await prisma.auditLog.create({
//     data: {
//       userId: req.user.id,
//       action: 'CREATE',
//       entity: 'Service',
//       entityId: service.id,
//       description: `Created booth service: ${service.name} (${service.category}) - GH₵${service.price}`,
//     },
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Booth service created successfully',
//     data: service,
//   });
// });

// // @desc    Update booth service
// // @route   PUT /api/services/booth/:id
// // @access  Private (Admin only)
// export const updateBoothService = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const { name, category, price, isActive } = req.body;

//   const service = await prisma.service.findUnique({
//     where: { id: parseInt(id) },
//   });

//   if (!service || service.type !== 'booth') {
//     throw new AppError('Booth service not found', 404, 'NOT_FOUND');
//   }

//   // Build update data
//   const updateData = {};
//   if (name !== undefined) updateData.name = name.trim();
//   if (category !== undefined) updateData.category = category.trim();
//   if (price !== undefined) {
//     if (parseFloat(price) <= 0) {
//       throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
//     }
//     updateData.price = parseFloat(price);
//   }
//   if (isActive !== undefined) updateData.isActive = Boolean(isActive);

//   // Check for duplicate name if name is being changed
//   if (name && name.trim() !== service.name) {
//     const existingService = await prisma.service.findFirst({
//       where: {
//         type: 'booth',
//         name: name.trim(),
//         id: { not: parseInt(id) },
//       },
//     });

//     if (existingService) {
//       throw new AppError(
//         'A booth service with this name already exists',
//         400,
//         'DUPLICATE_ENTRY'
//       );
//     }
//   }

//   // Update service
//   const updatedService = await prisma.service.update({
//     where: { id: parseInt(id) },
//     data: updateData,
//   });

//   // Log audit
//   await prisma.auditLog.create({
//     data: {
//       userId: req.user.id,
//       action: 'UPDATE',
//       entity: 'Service',
//       entityId: updatedService.id,
//       description: `Updated booth service: ${updatedService.name}`,
//     },
//   });

//   res.status(200).json({
//     success: true,
//     message: 'Booth service updated successfully',
//     data: updatedService,
//   });
// });

// // @desc    Delete booth service
// // @route   DELETE /api/services/booth/:id
// // @access  Private (Admin only)
// export const deleteBoothService = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const service = await prisma.service.findUnique({
//     where: { id: parseInt(id) },
//     include: {
//       _count: {
//         select: {
//           saleItems: true,
//         },
//       },
//     },
//   });

//   if (!service || service.type !== 'booth') {
//     throw new AppError('Booth service not found', 404, 'NOT_FOUND');
//   }

//   // Check if service has been used in sales
//   if (service._count.saleItems > 0) {
//     // Soft delete - deactivate instead
//     const deactivatedService = await prisma.service.update({
//       where: { id: parseInt(id) },
//       data: { isActive: false },
//     });

//     await prisma.auditLog.create({
//       data: {
//         userId: req.user.id,
//         action: 'DEACTIVATE',
//         entity: 'Service',
//         entityId: deactivatedService.id,
//         description: `Deactivated booth service with sales history: ${deactivatedService.name}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Booth service deactivated (has sales history)',
//       data: deactivatedService,
//     });
//   }

//   // Hard delete if no sales history
//   await prisma.service.delete({
//     where: { id: parseInt(id) },
//   });

//   await prisma.auditLog.create({
//     data: {
//       userId: req.user.id,
//       action: 'DELETE',
//       entity: 'Service',
//       entityId: parseInt(id),
//       description: `Deleted booth service: ${service.name}`,
//     },
//   });

//   res.status(200).json({
//     success: true,
//     message: 'Booth service deleted successfully',
//   });
// });

// // @desc    Toggle booth service status
// // @route   PUT /api/services/booth/:id/toggle
// // @access  Private (Admin only)
// export const toggleBoothService = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const service = await prisma.service.findUnique({
//     where: { id: parseInt(id) },
//   });

//   if (!service || service.type !== 'booth') {
//     throw new AppError('Booth service not found', 404, 'NOT_FOUND');
//   }

//   const updatedService = await prisma.service.update({
//     where: { id: parseInt(id) },
//     data: { isActive: !service.isActive },
//   });

//   await prisma.auditLog.create({
//     data: {
//       userId: req.user.id,
//       action: 'UPDATE',
//       entity: 'Service',
//       entityId: updatedService.id,
//       description: `${updatedService.isActive ? 'Activated' : 'Deactivated'} booth service: ${updatedService.name}`,
//     },
//   });

//   res.status(200).json({
//     success: true,
//     message: `Booth service ${updatedService.isActive ? 'activated' : 'deactivated'} successfully`,
//     data: updatedService,
//   });
// });

// // @desc    Get booth service statistics
// // @route   GET /api/services/booth/stats
// // @access  Private
// export const getBoothServiceStats = asyncHandler(async (req, res) => {
//   const [totalServices, activeServices, servicesByCategory] = await Promise.all([
//     // Total services
//     prisma.service.count({
//       where: { type: 'booth' },
//     }),

//     // Active services
//     prisma.service.count({
//       where: { type: 'booth', isActive: true },
//     }),

//     // Services by category
//     prisma.service.groupBy({
//       by: ['category'],
//       where: { type: 'booth' },
//       _count: true,
//     }),
//   ]);

//   res.status(200).json({
//     success: true,
//     data: {
//       totalServices,
//       activeServices,
//       inactiveServices: totalServices - activeServices,
//       servicesByCategory,
//     },
//   });
// });


// backend/src/controllers/serviceController.js - Updated for booth service concept
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
    orderBy: [
      { name: 'asc' },      // Service Category (e.g. Full Body, Touch Up)
      { category: 'asc' },  // Item Category (e.g. 4x4, Saloon, Fridge)
    ],
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services,
  });
});

// @desc    Get service categories (Service Category - e.g. Full Body, Touch Up)
// @route   GET /api/services/booth/categories
// @access  Private
export const getServiceCategories = asyncHandler(async (req, res) => {
  // Get unique service categories (using 'name' field from your schema)
  const services = await prisma.service.findMany({
    where: {
      type: 'booth',
      isActive: true,
    },
    distinct: ['name'],  // Using 'name' field from your schema
    select: {
      name: true,        // Using 'name' field from your schema
    },
  });

  const categories = services.map(s => s.name);

  res.status(200).json({
    success: true,
    data: categories,
  });
});

// @desc    Get item categories for a service category (Item Category - e.g. 4x4, Saloon, Fridge)
// @route   GET /api/services/booth/items/:serviceCategory
// @access  Private
export const getItemCategories = asyncHandler(async (req, res) => {
  const { serviceCategory } = req.params;

  const services = await prisma.service.findMany({
    where: {
      type: 'booth',
      name: serviceCategory,  // Using 'name' field from your schema
      isActive: true,
    },
    select: {
      id: true,
      category: true,  // Item Category (e.g. 4x4, Saloon, Fridge)
      price: true,
    },
  });

  // Format response to match what the frontend expects
  const formattedServices = services.map(service => ({
    id: service.id,
    itemCategory: service.category,  // Frontend expects itemCategory
    price: service.price
  }));

  res.status(200).json({
    success: true,
    data: formattedServices,
  });
});

// @desc    Get service price by category combination
// @route   GET /api/services/booth/price
// @access  Private
export const getServicePrice = asyncHandler(async (req, res) => {
  const { serviceCategory, itemCategory } = req.query;

  if (!serviceCategory || !itemCategory) {
    throw new AppError(
      'Please provide both serviceCategory and itemCategory',
      400,
      'VALIDATION_ERROR'
    );
  }

  const service = await prisma.service.findFirst({
    where: {
      type: 'booth',
      name: serviceCategory,    // Using 'name' field from your schema
      category: itemCategory,   // Using 'category' field from your schema
      isActive: true,
    },
  });

  if (!service) {
    throw new AppError(
      'Service not found for this combination',
      404,
      'NOT_FOUND'
    );
  }

  res.status(200).json({
    success: true,
    data: service,
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
  const { serviceCategory, itemCategory, price } = req.body;  // Changed parameter names to match your concept

  // Validation - map the parameter names to your schema fields
  if (!serviceCategory || !itemCategory || !price) {
    throw new AppError(
      'Please provide serviceCategory, itemCategory, and price',
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

  // Check if combination exists (using your schema field names)
  const existing = await prisma.service.findFirst({
    where: {
      type: 'booth',
      name: serviceCategory.trim(),     // Using 'name' field from your schema
      category: itemCategory.trim(),    // Using 'category' field from your schema
    },
  });

  if (existing) {
    throw new AppError(
      'A service with this combination already exists',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  // Create service (using your schema field names)
  const service = await prisma.service.create({
    data: {
      type: 'booth',
      name: serviceCategory.trim(),     // Service Category (e.g. Full Body, Touch Up)
      category: itemCategory.trim(),    // Item Category (e.g. 4x4, Saloon, Fridge)
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
      description: `Created booth service: ${service.name} - ${service.category} (GH₵${service.price})`,
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
  const { serviceCategory, itemCategory, price, isActive } = req.body;  // Changed parameter names

  const service = await prisma.service.findUnique({
    where: { id: parseInt(id) },
  });

  if (!service || service.type !== 'booth') {
    throw new AppError('Booth service not found', 404, 'NOT_FOUND');
  }

  // Build update data using your schema field names
  const updateData = {};
  if (serviceCategory !== undefined) updateData.name = serviceCategory.trim();     // Service Category
  if (itemCategory !== undefined) updateData.category = itemCategory.trim();      // Item Category
  if (price !== undefined) {
    if (parseFloat(price) <= 0) {
      throw new AppError('Price must be greater than 0', 400, 'VALIDATION_ERROR');
    }
    updateData.price = parseFloat(price);
  }
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  // Check for duplicate combination if categories are being changed
  if (serviceCategory || itemCategory) {
    const newName = serviceCategory?.trim() || service.name;        // Service Category
    const newCategory = itemCategory?.trim() || service.category;   // Item Category

    if (newName !== service.name || newCategory !== service.category) {  // Using your schema field names
      const existing = await prisma.service.findFirst({
        where: {
          type: 'booth',
          name: newName,          // Service Category
          category: newCategory,  // Item Category
          id: { not: parseInt(id) },
        },
      });

      if (existing) {
        throw new AppError(
          'A service with this combination already exists',
          400,
          'DUPLICATE_ENTRY'
        );
      }
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
      description: `Updated booth service: ${updatedService.name} - ${updatedService.category}`,  // Using your schema field names
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
        description: `Deactivated booth service with sales history: ${deactivatedService.name} - ${deactivatedService.category}`,  // Using your schema field names
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
      description: `Deleted booth service: ${service.name} - ${service.category}`,  // Using your schema field names
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
      description: `${updatedService.isActive ? 'Activated' : 'Deactivated'} booth service: ${updatedService.name} - ${updatedService.category}`,
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
  const [
    totalServices,
    activeServices,
    servicesByCategory,
    itemsByCategory,
  ] = await Promise.all([
    // Total services
    prisma.service.count({
      where: { type: 'booth' },
    }),

    // Active services
    prisma.service.count({
      where: { type: 'booth', isActive: true },
    }),

    // Services by service category (using 'name' field from your schema)
    prisma.service.groupBy({
      by: ['name'],  // Service Category
      where: { type: 'booth' },
      _count: true,
    }),

    // Services by item category (using 'category' field from your schema)
    prisma.service.groupBy({
      by: ['category'],  // Item Category
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
      itemsByCategory,
    },
  });
});