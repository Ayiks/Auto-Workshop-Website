import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Helper function to generate receipt number
const generateReceiptNumber = async () => {
  const prefix = 'RCP';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get count of receipts today
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const count = await prisma.receipt.count({
    where: {
      issuedDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
};

// @desc    Create counter sale
// @route   POST /api/sales
// @access  Private (requires 'sales:create' permission)
export const createSale = asyncHandler(async (req, res) => {
  const { items, paymentMethod = 'cash' } = req.body;

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
        unitPrice: material.sellingPrice,
        subtotal,
      });
      totalAmount += subtotal;

    } else if (item.itemType === 'booth') {
      // Fetch booth service
      const service = await prisma.service.findFirst({
        where: { type: 'booth', isActive: true },
      });

      if (!service) {
        throw new AppError('Booth service not configured', 404, 'NOT_FOUND');
      }

      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: service.price,
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
  data: JSON.parse(JSON.stringify(completeSale, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  )),
});

});

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private (requires 'sales:view' or 'sales:viewOwn' permission)
export const getSales = asyncHandler(async (req, res) => {
  const { startDate, endDate, paymentMethod, soldBy } = req.query;

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

  const sales = await prisma.sale.findMany({
    where,
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
  });

  res.status(200).json({
    success: true,
    count: sales.length,
    data: sales,
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