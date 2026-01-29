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
  // 1. EXTRACT ALL DATA (Fixed: Added customer & payment fields)
  const { 
    items, 
    paymentMethod, 
    saleDate: userProvidedDate,
    customerId,
    customerName,
    paymentStatus,
    amountPaid,
    discount 
  } = req.body;

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

  // Validate and calculate total
  let calculatedSubtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.itemType || !['material', 'booth'].includes(item.itemType)) {
      throw new AppError('Invalid item type', 400, 'VALIDATION_ERROR');
    }

    if (item.itemType === 'material') {
      if (!item.materialId || !item.quantity || item.quantity <= 0) {
        throw new AppError('Invalid material data', 400, 'VALIDATION_ERROR');
      }

      const material = await prisma.material.findUnique({
        where: { id: parseInt(item.materialId) },
      });

      if (!material) throw new AppError(`Material ID ${item.materialId} not found`, 404, 'NOT_FOUND');
      if (!material.isActive) throw new AppError(`Material "${material.name}" is inactive`, 400, 'INVALID_OPERATION');
      
      if (material.quantity < item.quantity) {
        throw new AppError(`Insufficient stock for "${material.name}". Available: ${material.quantity}`, 400, 'INSUFFICIENT_STOCK');
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
      calculatedSubtotal += subtotal;

    } else if (item.itemType === 'booth') {
      const service = await prisma.service.findUnique({
        where: { type: 'booth', isActive: true, id: parseInt(item.serviceId) },
      });

      if (!service) throw new AppError('Booth service not configured', 404, 'NOT_FOUND');

      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: service.price,
        unitCost: 0,
        subtotal: service.price,
      });
      calculatedSubtotal += service.price;
    }
  }

  // 2. APPLY DISCOUNT & CALCULATE BALANCE (Fixed)
  const finalDiscount = parseFloat(discount || 0);
  const finalTotalAmount = Math.max(0, calculatedSubtotal - finalDiscount);
  const finalAmountPaid = parseFloat(amountPaid || 0);
  
  // If status is paid, balance is 0. If partial, calculate diff.
  const balance = Math.max(0, finalTotalAmount - finalAmountPaid);

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    
    // 3. CREATE SALE WITH NEW FIELDS (Fixed)
    const sale = await tx.sale.create({
      data: {
        totalAmount: finalTotalAmount,
        discount: finalDiscount,
        amountPaid: finalAmountPaid,
        balance: balance, // Ensure your schema has a 'balance' float column. If not, remove this.
        paymentMethod,
        paymentStatus: paymentStatus || 'paid', // Save 'partially', 'unpaid', or 'paid'
        soldBy: req.user.id,
        status: 'completed', // Workflow status
        saleDate: finalSaleDate,
        // Customer Linking
        customerId: customerId ? parseInt(customerId) : null,
        customerName: customerName || (customerId ? undefined : 'Walking Customer'), // Fallback name
        customerPhone: req.body.customerPhone || null,
      },
    });

    // 4. Create sale items
    for (const item of validatedItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          ...item,
        },
      });

      if (item.itemType === 'material') {
        await tx.material.update({
          where: { id: item.materialId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    // 5. Generate Receipt
    const businessSettings = await tx.businessSettings.findFirst();
    // (Optional: handle if no settings exist nicely, or keep throw)
    
    const receiptNumber = await generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        receiptType: 'sale',
        saleId: sale.id,
        amount: finalTotalAmount,
        paymentMethod,
        issuedBy: req.user.id,
        businessName: businessSettings?.name || 'Default Store',
        businessLogo: businessSettings?.logo,
        businessAddress: businessSettings?.address,
        businessContact: businessSettings?.phone,
        issuedDate: finalSaleDate,
      },
    });

    // 6. Audit Log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Sale',
        entityId: sale.id,
        description: `Created sale #${sale.id}. Total: ${finalTotalAmount}. Paid: ${finalAmountPaid}. Status: ${paymentStatus}`,
      },
    });

    return { sale, receipt };
  });

  const completeSale = await prisma.sale.findUnique({
    where: { id: result.sale.id },
    include: {
      items: true,
      receipt: true,
      user: { select: { fullName: true, username: true } },
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
// @desc    Add payment to an existing sale (Top Up)
// @route   POST /api/sales/:id/payment
// @access  Private
export const addPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, paymentMethod } = req.body;

  // 1. Validation
  if (!amount || amount <= 0) {
    throw new AppError('Please provide a valid amount', 400, 'VALIDATION_ERROR');
  }

  // 2. Find the Sale
  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: { receipt: true }
  });

  if (!sale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  if (sale.paymentStatus === 'paid') {
    throw new AppError('This sale is already fully paid', 400, 'INVALID_OPERATION');
  }

  // 3. Calculations
  const newAmountPaid = parseFloat(sale.amountPaid) + parseFloat(amount);
  const newBalance = parseFloat(sale.totalAmount) - newAmountPaid;
  
  // Determine new status
  // Allow for small floating point errors (epsilon)
  const isPaid = newBalance <= 0.01; 
  const newStatus = isPaid ? 'paid' : 'partial';

  if (newBalance < -0.01) {
     throw new AppError(`Overpayment detected. Remaining balance is only ${sale.balance}`, 400, 'VALIDATION_ERROR');
  }

  // 4. Update Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Update Sale Record
    const updatedSale = await tx.sale.update({
      where: { id: parseInt(id) },
      data: {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        paymentStatus: newStatus,
        // Optional: Update payment method to the latest one used, or keep original
        // paymentMethod: paymentMethod 
      }
    });

    // B. Create a Payment History Record (Optional but recommended)
    // If you have a 'Payment' table, create a record here.
    // await tx.payment.create({ ... })

    // C. Update Receipt (Reflect the new total paid)
    if (sale.receipt) {
       await tx.receipt.update({
         where: { id: sale.receipt.id },
         data: {
           // You might want to track history, but for now we update the main receipt
           paymentMethod: paymentMethod // Update to latest method?
         }
       });
    }

    // D. Audit Log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PAYMENT',
        entity: 'Sale',
        entityId: parseInt(id),
        description: `Added payment of GH₵${amount} via ${paymentMethod}. New Balance: ${newBalance.toFixed(2)}`
      }
    });

    return updatedSale;
  });

  // 5. Return Result
  // Fetch fresh data including items for the receipt view
  const finalSale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: { 
      items: true, 
      receipt: true,
      user: { select: { fullName: true, username: true } }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Payment added successfully',
    data: {
      sale: finalSale,
      receipt: finalSale.receipt // Send back receipt so frontend can show it
    }
  });
});

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private (requires 'sales:view' or 'sales:viewOwn' permission)
export const getSales = asyncHandler(async (req, res) => {
  // 1. EXTRACT 'paymentStatus' FROM QUERY
  const { startDate, endDate, paymentMethod, paymentStatus, soldBy, page = 1, limit = 10 } = req.query;

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

  // 2. FILTER BY PAYMENT STATUS (Paid, Partial, Unpaid)
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  // Filter by seller
  if (soldBy) {
    where.soldBy = parseInt(soldBy);
  }

  // If user only has viewOwn permission, filter to their sales
  if (req.isOwnResource) {
    where.soldBy = req.user.id;
  }

  // 3. UPDATE TRANSACTION (Added 'statusStats' as the 5th item)
  const [sales, totalCount, revenueAgg, paymentStats, statusStats] = await prisma.$transaction([
    // Query 1: Get Sales
    prisma.sale.findMany({
      where,
      skip: skip,
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

    // Query 2: Total Count
    prisma.sale.count({ where }),

    // Query 3: Revenue
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      where,
    }),

    // Query 4: Group by Payment Method
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      _count: { paymentMethod: true },
      where,
    }),

    // Query 5: Group by Payment Status (NEW)
    prisma.sale.groupBy({
      by: ['paymentStatus'],
      _count: { paymentStatus: true },
      where,
    }),
  ]);

  // Map Payment Method Stats
  const methodMap = {};
  paymentStats.forEach((stat) => {
    methodMap[stat.paymentMethod] = stat._count.paymentMethod;
  });

  // 4. MAP STATUS STATS (NEW)
  const statusMap = {};
  statusStats.forEach((stat) => {
    statusMap[stat.paymentStatus] = stat._count.paymentStatus;
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
      // Method Counts
      cashCount: methodMap['cash'] || 0,
      momoCount: methodMap['momo'] || 0,
      chequeCount: methodMap['cheque'] || 0,
      // Status Counts (Added these)
      paidCount: statusMap['paid'] || 0,
      partialCount: statusMap['partially'] || 0,
      unpaidCount: statusMap['unpaid'] || 0,
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