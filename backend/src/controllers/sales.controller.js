import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Helper function to generate receipt number
const generateReceiptNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `RCP${year}${month}${day}${timestamp}${random}`;
};

// @desc    Create counter sale
// @route   POST /api/sales
// @access  Private (requires 'sales:create' permission)
export const createSale = asyncHandler(async (req, res) => {
  const { items, paymentMethod, saleDate: userProvidedDate } = req.body;

  let finalSaleDate = new Date();
  if (userProvidedDate) {
    const datePart = new Date(userProvidedDate);

    const timePart = new Date();

    datePart.setHours(timePart.getHours());
    datePart.setMinutes(timePart.getMinutes());
    datePart.setSeconds(timePart.getSeconds());
    datePart.setMilliseconds(timePart.getMilliseconds());

    finalSaleDate = datePart;
  }

  // Validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Please provide sale items', 400, 'VALIDATION_ERROR');
  }

  if (!['cash', 'momo', 'cheque'].includes(paymentMethod)) {
    throw new AppError(
      'Invalid payment method. Must be cash, momo, or cheque',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate and calculate total
  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.itemType || !['material', 'booth'].includes(item.itemType)) {
      throw new AppError(
        'Invalid item type. Must be material or booth',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (item.itemType === 'material') {
      if (!item.materialId || !item.quantity || item.quantity <= 0) {
        throw new AppError(
          'Material items require valid materialId and quantity',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Fetch material
      const material = await prisma.material.findUnique({
        where: { id: parseInt(item.materialId) },
      });

      if (!material) {
        throw new AppError(
          `Material with ID ${item.materialId} not found`,
          404,
          'NOT_FOUND'
        );
      }

      if (!material.isActive) {
        throw new AppError(
          `Material "${material.name}" is inactive`,
          400,
          'INVALID_OPERATION'
        );
      }

      if (material.quantity < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${material.name}". Available: ${material.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const subtotal = material.sellingPrice * item.quantity;
      validatedItems.push({
        itemType: 'material',
        materialId: material.id,
        materialName: material.name,
        quantity: item.quantity,
        unitCost: material.unitCost,
        unitPrice: material.sellingPrice,
        subtotal,
      });
      totalAmount += subtotal;

    } else if (item.itemType === 'booth') {
      // Fetch booth service
      const service = await prisma.service.findUnique({
        where: { type: 'booth', isActive: true, id: parseInt(item.serviceId) },
      });

      if (!service) {
        throw new AppError('Booth service not configured', 404, 'NOT_FOUND');
      }

      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: service.price,
        unitCost: 0,
        subtotal: service.price,
      });
      totalAmount += service.price;
    }
  }

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create sale
    const sale = await tx.sale.create({
      data: {
        totalAmount,
        paymentMethod,
        soldBy: req.user.id,
        status: 'completed',
        saleDate: finalSaleDate,
      },
    });

    // 2. Create sale items and update inventory
    for (const item of validatedItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          ...item,
        },
      });

      // Deduct material stock
      if (item.itemType === 'material') {
        await tx.material.update({
          where: { id: item.materialId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // 3. Get business settings for receipt
    const businessSettings = await tx.businessSettings.findFirst();
    if (!businessSettings) {
      throw new AppError('Business settings not configured', 500, 'CONFIG_ERROR');
    }

    // 4. Generate receipt
    const receiptNumber = await generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        receiptType: 'sale',
        saleId: sale.id,
        amount: totalAmount,
        paymentMethod,
        issuedBy: req.user.id,
        businessName: businessSettings.name,
        businessLogo: businessSettings.logo,
        businessAddress: businessSettings.address,
        businessContact: businessSettings.phone,
        issuedDate: finalSaleDate,
      },
    });

    // 5. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Sale',
        entityId: sale.id,
        description: `Created sale #${sale.id}. Total: GH₵${totalAmount}. Payment: ${paymentMethod}`,
      },
    });

    return { sale, receipt };
  });

  // Fetch complete sale with items
  const completeSale = await prisma.sale.findUnique({
    where: { id: result.sale.id },
    include: {
      items: true,
      receipt: true,
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Sale completed successfully',
    data: {
      sale: completeSale,
      receipt: result.receipt,
    },
  });
});

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private (requires 'sales:update' permission)
export const updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, paymentMethod, saleDate, reverseInventory = true } = req.body;

  // Validate sale exists
  const existingSale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: { 
      items: true,
      receipt: true,
    },
  });

  if (!existingSale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  // Validate request
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Please provide sale items', 400, 'VALIDATION_ERROR');
  }

  if (paymentMethod && !['cash', 'momo', 'cheque'].includes(paymentMethod)) {
    throw new AppError(
      'Invalid payment method. Must be cash, momo, or cheque',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate and calculate new total
  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.itemType || !['material', 'booth'].includes(item.itemType)) {
      throw new AppError(
        'Invalid item type. Must be material or booth',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (item.itemType === 'material') {
      if (!item.materialId || !item.quantity || item.quantity <= 0) {
        throw new AppError(
          'Material items require valid materialId and quantity',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Fetch material
      const material = await prisma.material.findUnique({
        where: { id: parseInt(item.materialId) },
      });

      if (!material) {
        throw new AppError(
          `Material with ID ${item.materialId} not found`,
          404,
          'NOT_FOUND'
        );
      }

      if (!material.isActive) {
        throw new AppError(
          `Material "${material.name}" is inactive`,
          400,
          'INVALID_OPERATION'
        );
      }

      // FIXED: Only validate stock if quantity changed or material changed
      let availableQuantity = material.quantity;
      
      // Find the existing item for this material in the old sale
      const existingMaterialItem = existingSale.items.find(
        i => i.itemType === 'material' && i.materialId === material.id
      );

      if (existingMaterialItem) {
        // This material was in the original sale
        const oldQuantity = parseFloat(existingMaterialItem.quantity);
        const newQuantity = parseFloat(item.quantity);
        
        // Add back the old quantity to available stock
        availableQuantity += oldQuantity;
        
        // Only validate if quantity actually increased
        if (newQuantity > oldQuantity) {
          const additionalNeeded = newQuantity - oldQuantity;
          if (material.quantity < additionalNeeded) {
            throw new AppError(
              `Insufficient stock for "${material.name}". You're increasing quantity by ${additionalNeeded.toFixed(2)}, but only ${material.quantity} available in stock.`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        }
      } else {
        // This is a new material being added to the sale
        // Only validate if reverseInventory is true (old items will be returned)
        if (reverseInventory) {
          if (material.quantity < item.quantity) {
            throw new AppError(
              `Insufficient stock for "${material.name}". Available: ${material.quantity}`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        } else {
          // If not reversing, we need to account for current stock only
          if (material.quantity < item.quantity) {
            throw new AppError(
              `Insufficient stock for "${material.name}". Available: ${material.quantity}`,
              400,
              'INSUFFICIENT_STOCK'
            );
          }
        }
      }

      const subtotal = material.sellingPrice * item.quantity;
      validatedItems.push({
        itemType: 'material',
        materialId: material.id,
        materialName: material.name,
        quantity: parseFloat(item.quantity),
        unitPrice: material.sellingPrice,
        unitCost: material.unitCost,
        subtotal,
      });
      totalAmount += subtotal;

    } else if (item.itemType === 'booth') {
      // Fetch booth service - FIXED: Use serviceId from item
      const service = await prisma.service.findUnique({
        where: { 
          id: parseInt(item.serviceId)
        },
      });

      if (!service) {
        throw new AppError('Booth service not found', 404, 'NOT_FOUND');
      }

      if (!service.isActive) {
        throw new AppError('Booth service is inactive', 400, 'INVALID_OPERATION');
      }

      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: service.price,
        unitCost: 0,
        subtotal: service.price,
      });
      totalAmount += service.price;
    }
  }

  // Start transaction for update
  const result = await prisma.$transaction(async (tx) => {
    // 1. Reverse inventory if needed
    if (reverseInventory) {
      for (const item of existingSale.items) {
        if (item.itemType === 'material') {
          await tx.material.update({
            where: { id: item.materialId },
            data: {
              quantity: {
                increment: parseFloat(item.quantity),
              },
            },
          });
        }
      }
    }

    // 2. Delete existing sale items
    await tx.saleItem.deleteMany({
      where: { saleId: parseInt(id) },
    });

    // 3. Update sale with new data
    const saleUpdateData = {
      totalAmount,
      paymentMethod: paymentMethod || existingSale.paymentMethod,
    };

    // Update saleDate if provided
    if (saleDate) {
      const parsedDate = new Date(saleDate);
      if (!isNaN(parsedDate.getTime())) {
        saleUpdateData.saleDate = parsedDate;
      }
    }

    const updatedSale = await tx.sale.update({
      where: { id: parseInt(id) },
      data: saleUpdateData,
    });

    // 4. Create new sale items and update inventory
    for (const item of validatedItems) {
      await tx.saleItem.create({
        data: {
          saleId: updatedSale.id,
          ...item,
        },
      });

      // Deduct material stock
      if (item.itemType === 'material') {
        await tx.material.update({
          where: { id: item.materialId },
          data: {
            quantity: {
              decrement: parseFloat(item.quantity),
            },
          },
        });
      }
    }

    // 5. Update receipt if exists
    if (existingSale.receipt) {
      await tx.receipt.update({
        where: { id: existingSale.receipt.id },
        data: {
          amount: totalAmount,
          paymentMethod: paymentMethod || existingSale.paymentMethod,
          issuedDate: saleDate ? new Date(saleDate) : existingSale.saleDate,
        },
      });
    }

    // 6. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Sale',
        entityId: parseInt(id),
        description: `Updated sale #${id}. New total: GH₵${totalAmount}. Payment: ${paymentMethod || existingSale.paymentMethod}`,
      },
    });

    return updatedSale;
  });

  // Fetch complete updated sale with items
  const completeSale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
      items: true,
      receipt: true,
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Sale updated successfully',
    data: completeSale,
  });
});

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private (requires 'sales:view' or 'sales:viewOwn' permission)
export const getSales = asyncHandler(async (req, res) => {
  const { startDate, endDate, paymentMethod, soldBy, page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const where = { status: 'completed' };

  // Date filtering
  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) where.saleDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.saleDate.lte = end;
    }
  }

  // Filter by payment method
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Filter by seller
  if (soldBy) {
    where.soldBy = parseInt(soldBy);
  }

  // If user only has viewOwn permission, filter to their sales
  if (req.isOwnResource) {
    where.soldBy = req.user.id;
  }

  const [sales, totalCount, revenueAgg, paymentStats] = await prisma.$transaction([
    prisma.sale.findMany({
    where,
    skip: skip,          // <--- Skip previous pages
    take: limitNumber,
    include: {
      items: true,
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      receipt: {
        select: {
          receiptNumber: true,
        },
      },
    },
    orderBy: { saleDate: 'desc' },
  }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where, // Important: Use same 'where' to respect date filters!
    }),
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      _count: { paymentMethod: true },
      where,
    }),
  ]);

  const statsMap = {};
  paymentStats.forEach((stat) => {
    statsMap[stat.paymentMethod] = stat._count.paymentMethod;
  });

  res.status(200).json({
    success: true,
    data: sales,
    // Pagination info
    totalItems: totalCount,
    totalPages: Math.ceil(totalCount / limitNumber),
    currentPage: pageNumber,
    // New Stats Object
    stats: {
      totalRevenue: revenueAgg._sum.totalAmount || 0,
      totalSales: totalCount,
      cashCount: statsMap['cash'] || 0,
      momoCount: statsMap['momo'] || 0,
    }
  });
});


// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private (requires 'sales:view' or 'sales:viewOwn' permission)
export const getSale = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
      items: {
        include: {
          material: {
            select: { name: true },
          },
          service: {
            select: { type: true },
          },
        },
      },
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      receipt: true,
    },
  });

  if (!sale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  // Check ownership if user has only viewOwn permission
  if (req.isOwnResource && sale.soldBy !== req.user.id) {
    throw new AppError(
      'Not authorized to view this sale',
      403,
      'PERMISSION_DENIED'
    );
  }

  res.status(200).json({
    success: true,
    data: sale,
  });
});

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private (requires 'sales:delete' permission)
export const deleteSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reverseInventory = true, reason } = req.body;

  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
      items: {
        include: {
          material: {
            select: { name: true },
          },
        },
      },
      receipt: true,
    },
  });

  if (!sale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  // Check ownership if user has only deleteOwn permission
  if (req.isOwnResource && sale.soldBy !== req.user.id) {
    throw new AppError(
      'Not authorized to delete this sale',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Start transaction to delete sale and optionally restore inventory
  await prisma.$transaction(async (tx) => {
    // Restore inventory if requested
    if (reverseInventory) {
      for (const item of sale.items) {
        if (item.itemType === 'material' && item.materialId) {
          await tx.material.update({
            where: { id: item.materialId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    }

    // Mark receipt as deleted (for audit trail)
    if (sale.receipt) {
      await tx.receipt.update({
        where: { id: sale.receipt.id },
        data: {
          // Add a deletedAt field or status if you have one
          // Otherwise, you might want to keep the receipt for audit purposes
        },
      });
    }

    // Delete sale items first (foreign key constraint)
    await tx.saleItem.deleteMany({
      where: { saleId: parseInt(id) },
    });

    // Delete the sale
    await tx.sale.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Sale',
        entityId: parseInt(id),
        description: `Deleted sale #${id}. ${reverseInventory ? 'Inventory restored.' : 'Inventory not affected.'} ${reason ? `Reason: ${reason}` : ''}`,
      },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Sale deleted successfully',
  });
});

// @desc    Get sales summary/stats
// @route   GET /api/sales/stats
// @access  Private (requires 'sales:view' permission)
export const getSalesStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = { status: 'completed' };

  // Date filtering
  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) where.saleDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.saleDate.lte = end;
    }
  }

  const [totalSales, salesByMethod, recentSales] = await Promise.all([
    // Total sales and amount
    prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: true,
    }),

    // Sales by payment method
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    }),

    // Recent sales
    prisma.sale.findMany({
      where,
      include: {
        user: {
          select: { fullName: true },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalSales: totalSales._count || 0,
      totalRevenue: totalSales._sum.totalAmount || 0,
      salesByMethod,
      recentSales,
    },
  });
});