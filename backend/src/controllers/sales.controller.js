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
// export const createSale = asyncHandler(async (req, res) => {
//   const { items, paymentMethod = 'cash' } = req.body;

//   // Validation
//   if (!items || !Array.isArray(items) || items.length === 0) {
//     throw new AppError('Please provide sale items', 400, 'VALIDATION_ERROR');
//   }

//   if (!['cash', 'momo', 'cheque'].includes(paymentMethod)) {
//     throw new AppError(
//       'Invalid payment method. Must be cash, momo, or cheque',
//       400,
//       'VALIDATION_ERROR'
//     );
//   }

//   // Validate and calculate total
//   let totalAmount = 0;
//   const validatedItems = [];

//   for (const item of items) {
//     if (!item.itemType || !['material', 'booth'].includes(item.itemType)) {
//       throw new AppError(
//         'Invalid item type. Must be material or booth',
//         400,
//         'VALIDATION_ERROR'
//       );
//     }

//     if (item.itemType === 'material') {
//       if (!item.materialId || !item.quantity || item.quantity <= 0) {
//         throw new AppError(
//           'Material items require valid materialId and quantity',
//           400,
//           'VALIDATION_ERROR'
//         );
//       }

//       // Fetch material
//       const material = await prisma.material.findUnique({
//         where: { id: parseInt(item.materialId) },
//       });

//       if (!material) {
//         throw new AppError(
//           `Material with ID ${item.materialId} not found`,
//           404,
//           'NOT_FOUND'
//         );
//       }

//       if (!material.isActive) {
//         throw new AppError(
//           `Material "${material.name}" is inactive`,
//           400,
//           'INVALID_OPERATION'
//         );
//       }

//       if (material.quantity < item.quantity) {
//         throw new AppError(
//           `Insufficient stock for "${material.name}". Available: ${material.quantity}`,
//           400,
//           'INSUFFICIENT_STOCK'
//         );
//       }

//       const subtotal = material.sellingPrice * item.quantity;
//       validatedItems.push({
//         itemType: 'material',
//         materialId: material.id,
//         materialName: material.name,
//         quantity: item.quantity,
//         unitPrice: material.sellingPrice,
//         subtotal,
//       });
//       totalAmount += subtotal;

//     } else if (item.itemType === 'booth') {
//       // Fetch booth service
//       const service = await prisma.service.findFirst({
//         where: { type: 'booth', isActive: true },
//       });

//       if (!service) {
//         throw new AppError('Booth service not configured', 404, 'NOT_FOUND');
//       }

//       validatedItems.push({
//         itemType: 'booth',
//         serviceId: service.id,
//         unitPrice: service.price,
//         subtotal: service.price,
//       });
//       totalAmount += service.price;
//     }
//   }

//   // Start transaction
//   const result = await prisma.$transaction(async (tx) => {
//     // 1. Create sale
//     const sale = await tx.sale.create({
//       data: {
//         totalAmount,
//         paymentMethod,
//         soldBy: req.user.id,
//         status: 'completed',
//       },
//     });

//     // 2. Create sale items and update inventory
//     for (const item of validatedItems) {
//       await tx.saleItem.create({
//         data: {
//           saleId: sale.id,
//           ...item,
//         },
//       });

//       // Deduct material stock
//       if (item.itemType === 'material') {
//         await tx.material.update({
//           where: { id: item.materialId },
//           data: {
//             quantity: {
//               decrement: item.quantity,
//             },
//           },
//         });
//       }
//     }

//     // 3. Get business settings for receipt
//     const businessSettings = await tx.businessSettings.findFirst();
//     if (!businessSettings) {
//       throw new AppError('Business settings not configured', 500, 'CONFIG_ERROR');
//     }

//     // 4. Generate receipt
//     const receiptNumber = await generateReceiptNumber();
//     const receipt = await tx.receipt.create({
//       data: {
//         receiptNumber,
//         receiptType: 'sale',
//         saleId: sale.id,
//         amount: totalAmount,
//         paymentMethod,
//         issuedBy: req.user.id,
//         businessName: businessSettings.name,
//         businessLogo: businessSettings.logo,
//         businessAddress: businessSettings.address,
//         businessContact: businessSettings.phone,
//       },
//     });

//     // 5. Log audit
//     await tx.auditLog.create({
//       data: {
//         userId: req.user.id,
//         action: 'CREATE',
//         entity: 'Sale',
//         entityId: sale.id,
//         description: `Created sale #${sale.id}. Total: GH₵${totalAmount}. Payment: ${paymentMethod}`,
//       },
//     });

//     return { sale, receipt };
//   });

//   // Fetch complete sale with items
//   const completeSale = await prisma.sale.findUnique({
//     where: { id: result.sale.id },
//     include: {
//       items: true,
//       receipt: true,
//       user: {
//         select: {
//           fullName: true,
//           username: true,
//         },
//       },
//     },
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Sale completed successfully',
//     data: {
//       sale: completeSale,
//       receipt: result.receipt,
//     },
//   });
// });
// backend/src/controllers/saleController.js - Updated createSale function

// @desc    Create counter sale
// @route   POST /api/sales
// @access  Private (requires 'sales:create' permission)
export const createSale = asyncHandler(async (req, res) => {
  const { items, paymentMethod = 'cash', saleDate } = req.body;

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

  // Validate and parse sale date
  let parsedSaleDate = new Date();
  if (saleDate) {
    parsedSaleDate = new Date(saleDate);
    
    // Validate date is not in the future
    if (parsedSaleDate > new Date()) {
      throw new AppError(
        'Sale date cannot be in the future',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Optional: Limit how far back they can backdate (e.g., 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    if (parsedSaleDate < ninetyDaysAgo) {
      throw new AppError(
        'Sale date cannot be more than 90 days in the past',
        400,
        'VALIDATION_ERROR'
      );
    }
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
    // 1. Create sale with custom date
    const sale = await tx.sale.create({
      data: {
        totalAmount,
        paymentMethod,
        soldBy: req.user.id,
        status: 'completed',
        saleDate: parsedSaleDate, // Use the parsed date
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

    // 4. Generate receipt (use sale date for receipt date)
    const receiptNumber = await generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        receiptType: 'sale',
        saleId: sale.id,
        amount: totalAmount,
        paymentMethod,
        issuedBy: req.user.id,
        issuedDate: parsedSaleDate, // Use the same date as sale
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
        description: `Created sale #${sale.id}. Total: GH₵${totalAmount}. Payment: ${paymentMethod}. Date: ${parsedSaleDate.toISOString().split('T')[0]}`,
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

// @desc    Update sale (edit items/payment method)
// @route   PUT /api/sales/:id
// @access  Private (requires 'sales:edit' permission or admin)
export const updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, paymentMethod, reverseInventory = true } = req.body;

  // Fetch existing sale
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

  // Check if sale can be edited (same day only for safety)
  const saleDate = new Date(existingSale.saleDate);
  const now = new Date();
  const hoursSinceSale = (now - saleDate) / (1000 * 60 * 60);

  // if (hoursSinceSale > 24) {
  //   throw new AppError(
  //     'Cannot edit sales older than 24 hours. Please create a reversal instead.',
  //     400,
  //     'INVALID_OPERATION'
  //   );
  // }

  // Validate new items if provided
  let totalAmount = 0;
  const validatedItems = [];

  if (items && items.length > 0) {
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

        // Check stock (add back old quantity to available)
        const oldItem = existingSale.items.find(
          i => i.materialId === material.id
        );
        const oldQuantity = oldItem ? oldItem.quantity : 0;
        const availableStock = material.quantity + oldQuantity;

        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${material.name}". Available: ${availableStock}`,
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
  }

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. If reverseInventory is true, restore old inventory
    if (reverseInventory) {
      for (const oldItem of existingSale.items) {
        if (oldItem.itemType === 'material' && oldItem.materialId) {
          await tx.material.update({
            where: { id: oldItem.materialId },
            data: {
              quantity: {
                increment: oldItem.quantity,
              },
            },
          });
        }
      }
    }

    // 2. Delete old sale items
    await tx.saleItem.deleteMany({
      where: { saleId: parseInt(id) },
    });

    // 3. Create new sale items and update inventory
    for (const item of validatedItems) {
      await tx.saleItem.create({
        data: {
          saleId: parseInt(id),
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

    // 4. Update sale
    const updatedSale = await tx.sale.update({
      where: { id: parseInt(id) },
      data: {
        totalAmount: items && items.length > 0 ? totalAmount : existingSale.totalAmount,
        paymentMethod: paymentMethod || existingSale.paymentMethod,
      },
    });

    // 5. Update receipt
    if (existingSale.receipt) {
      await tx.receipt.update({
        where: { id: existingSale.receipt.id },
        data: {
          amount: items && items.length > 0 ? totalAmount : existingSale.totalAmount,
          paymentMethod: paymentMethod || existingSale.paymentMethod,
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
        description: `Updated sale #${id}. Inventory ${reverseInventory ? 'reversed' : 'not reversed'}`,
      },
    });

    return updatedSale;
  });

  // Fetch complete updated sale
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

// @desc    Delete/Reverse sale
// @route   DELETE /api/sales/:id
// @access  Private (requires 'sales:delete' permission or admin)
export const deleteSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reverseInventory = true, reason } = req.body;

  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
      items: true,
      receipt: true,
    },
  });

  if (!sale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  // Start transaction
  await prisma.$transaction(async (tx) => {
    // 1. If reverseInventory is true, restore inventory
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

    // 2. Mark receipt as voided (don't delete for audit trail)
    if (sale.receipt) {
      await tx.receipt.update({
        where: { id: sale.receipt.id },
        data: {
          // Could add a 'voided' flag if you add it to schema
          // For now, we'll just keep it linked but delete the sale
        },
      });
    }

    // 3. Delete sale items
    await tx.saleItem.deleteMany({
      where: { saleId: parseInt(id) },
    });

    // 4. Delete sale
    await tx.sale.delete({
      where: { id: parseInt(id) },
    });

    // 5. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Sale',
        entityId: parseInt(id),
        description: `Deleted sale #${id}. Total: GH₵${sale.totalAmount}. Inventory ${reverseInventory ? 'reversed' : 'not reversed'}. Reason: ${reason || 'Not specified'}`,
      },
    });
  });

  res.status(200).json({
    success: true,
    message: `Sale deleted successfully. Inventory ${reverseInventory ? 'has been restored' : 'was not affected'}.`,
  });
});