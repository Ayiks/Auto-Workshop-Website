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
// @access  Private
export const createSale = asyncHandler(async (req, res) => {
  const { 
    items, paymentMethod, saleDate: userProvidedDate, customerId,
    customerName, paymentStatus, amountPaid, discount 
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

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Please provide sale items', 400, 'VALIDATION_ERROR');
  }

  let calculatedSubtotal = 0;
  const validatedItems = [];

  // --- NEW: TRACK RESERVED STOCK ACROSS DUPLICATE ROWS ---
  const stockReservations = {}; 
  // Structure: { materialId: totalQuantityDeductedSoFar }

  for (const item of items) {
    if (!item.itemType || !['material', 'booth'].includes(item.itemType)) {
      throw new AppError('Invalid item type', 400, 'VALIDATION_ERROR');
    }

    if (item.itemType === 'material') {
      const material = await req.db.material.findUnique({
        where: { id: parseInt(item.materialId) },
        include: { alternateUnits: true },
      });

      if (!material) throw new AppError(`Material ID ${item.materialId} not found`, 404, 'NOT_FOUND');
      if (!material.isActive) throw new AppError(`Material "${material.name}" is inactive`, 400, 'INVALID_OPERATION');
      
      // Unit Conversion Logic
      let quantityToDeduct = parseFloat(item.quantity);
      let unitPriceUsed = parseFloat(material.sellingPrice);
      let unitCostUsed = parseFloat(material.unitCost);
      let selectedUnitId = null;

      if (item.unitId) {
        const selectedUnit = material.alternateUnits.find(u => u.id === parseInt(item.unitId));
        if (!selectedUnit) throw new AppError(`Invalid unit selected for ${material.name}`, 400);

        selectedUnitId = selectedUnit.id;
        unitPriceUsed = parseFloat(selectedUnit.price);
        quantityToDeduct = parseFloat(item.quantity) * parseFloat(selectedUnit.factor);
      }

      // --- NEW: CHECK TOTAL RESERVED STOCK ---
      const previouslyReserved = stockReservations[material.id] || 0;
      const totalNeeded = previouslyReserved + quantityToDeduct;

      if (parseFloat(material.quantity) < totalNeeded) {
        throw new AppError(
          `Insufficient stock for "${material.name}". Need total ${totalNeeded} (including duplicates), but only ${material.quantity} available.`, 
          400, 
          'INSUFFICIENT_STOCK'
        );
      }

      stockReservations[material.id] = totalNeeded;
      // ---------------------------------------

      const subtotal = unitPriceUsed * parseFloat(item.quantity);      
      
      validatedItems.push({
        itemType: 'material',
        materialId: material.id,
        materialName: material.name,
        materialUnitId: selectedUnitId,
        quantity: parseFloat(item.quantity),
        quantityToDeduct: quantityToDeduct, 
        unitCost: unitCostUsed,
        unitPrice: unitPriceUsed,
        subtotal,
      });
      calculatedSubtotal += subtotal;

    } else if (item.itemType === 'booth') {
       const service = await req.db.service.findUnique({
        where: { type: 'booth', isActive: true, id: parseInt(item.serviceId) },
      });

      if (!service) throw new AppError('Booth service not configured', 404, 'NOT_FOUND');

      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: parseFloat(service.price),
        unitCost: 0,
        subtotal: parseFloat(service.price),
      });
      calculatedSubtotal += parseFloat(service.price);
    }
  }

  const finalDiscount = parseFloat(discount || 0);
  const finalTotalAmount = Math.max(0, calculatedSubtotal - finalDiscount);
  const finalAmountPaid = parseFloat(amountPaid || 0);
  const balance = Math.max(0, finalTotalAmount - finalAmountPaid);

  const result = await req.db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        totalAmount: finalTotalAmount,
        discount: finalDiscount,
        amountPaid: finalAmountPaid,
        balance: balance,
        paymentMethod,
        paymentStatus: paymentStatus || 'paid',
        soldBy: req.user.id,
        status: 'completed',
        saleDate: finalSaleDate,
        customerId: customerId ? parseInt(customerId) : null,
        customerName: customerName || (customerId ? undefined : 'Walking Customer'),
        customerPhone: req.body.customerPhone || null,
      },
    });

    for (const item of validatedItems) {
      const { quantityToDeduct, ...itemData } = item;
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          ...itemData,
        },
      });

      if (item.itemType === 'material') {
        await tx.material.update({
          where: { id: item.materialId },
          data: { quantity: { decrement: item.quantityToDeduct } },
        });
      }
    }

    // 🌟 Explicitly fetch business settings using the logged-in user's business ID
    const businessSettings = await tx.businessSettings.findFirst({
      where: { businessId: req.user.businessId }
    });    
    
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

  // 1. Fully hydrate the Sale object
  const completeSale = await req.db.sale.findUnique({
      where: { id: result.sale.id },
      include: {
        items: {
          include: {
            material: true, 
            service: true,  
          },
        },
        user: { 
          select: { fullName: true, username: true }
        },
        customer: true,
      },
    });

  // 2. Fully hydrate the Receipt object (Deeply nesting sale items for the frontend)
  const completeReceipt = await req.db.receipt.findUnique({
      where: { id: result.receipt.id },
      include: {
        user: {
          select: { fullName: true, username: true } 
        },
        sale: {
           include: {
             items: {
               include: { material: true, service: true }
             },
             customer: true,
             user: { select: { fullName: true, username: true } }
           }
        }
      }
  });

  res.status(201).json({
    success: true,
    message: 'Sale completed successfully',
    data: {
      sale: completeSale,
      receipt: completeReceipt,
    },
  });
});

// @desc    Update sale (Handles Unit Conversions logic for Inventory Reversal)
// @route   PUT /api/sales/:id
// @access  Private (requires 'sales:update' permission)
export const updateSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, paymentMethod, saleDate, reverseInventory = true } = req.body;

  const existingSale = await req.db.sale.findUnique({
    where: { id: parseInt(id) },
    include: { items: true, receipt: true },
  });

  if (!existingSale) {
    throw new AppError('Sale not found', 404, 'NOT_FOUND');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Please provide sale items', 400, 'VALIDATION_ERROR');
  }

  let totalAmount = 0;
  const validatedItems = [];

  // Validate Items Loop
  for (const item of items) {
    if (item.itemType === 'material') {
      const material = await req.db.material.findUnique({
        where: { id: parseInt(item.materialId) },
        include: { alternateUnits: true }
      });

      if (!material) throw new AppError(`Material ${item.materialId} not found`, 404);
      if (!material.isActive) throw new AppError(`Material inactive`, 400);

      // --- UNIT LOGIC START ---
      let quantityToDeduct = parseFloat(item.quantity);
      let unitPriceUsed = parseFloat(material.sellingPrice);
      let selectedUnitId = null;

      // Handle Unit Selection
      if (item.unitId) {
        const selectedUnit = material.alternateUnits.find(u => u.id === parseInt(item.unitId));
        if (!selectedUnit) throw new AppError('Invalid unit', 400);
        
        selectedUnitId = selectedUnit.id;
        unitPriceUsed = parseFloat(selectedUnit.price);
        quantityToDeduct = parseFloat(item.quantity) * parseFloat(selectedUnit.factor);
      }
      // ------------------------

      // Stock Check Logic (Existing Sale vs New Qty)
      let availableQuantity = parseFloat(material.quantity);
      
      // If updating, add back the OLD quantity to available stock virtually
      const existingMaterialItem = existingSale.items.find(
        i => i.itemType === 'material' && i.materialId === material.id
      );

      if (existingMaterialItem) {
        // We need to fetch the Factor of the OLD item to know how much to add back
        let oldDeduction = parseFloat(existingMaterialItem.quantity);
        
        // If the OLD item had a unit, look up that unit's factor
        if (existingMaterialItem.materialUnitId) {
           const oldUnit = await req.db.materialUnit.findUnique({ where: { id: existingMaterialItem.materialUnitId }});
           // If unit still exists, use its factor. If deleted, assume factor 1 (safeguard)
           if (oldUnit) oldDeduction = oldDeduction * parseFloat(oldUnit.factor);
        }

        availableQuantity += oldDeduction;
        
        // Check: Is NEW deduction > (Current Stock + Old Deduction)?
        if (quantityToDeduct > availableQuantity) {
           throw new AppError(`Insufficient stock for "${material.name}".`, 400);
        }
      } else {
        // New item entirely
        if (quantityToDeduct > availableQuantity) {
           throw new AppError(`Insufficient stock for "${material.name}".`, 400);
        }
      }

      const subtotal = unitPriceUsed * parseFloat(item.quantity);
      validatedItems.push({
        itemType: 'material',
        materialId: material.id,
        materialName: material.name,
        materialUnitId: selectedUnitId,
        quantity: parseFloat(item.quantity),
        quantityToDeduct, // Helper
        unitPrice: unitPriceUsed,
        unitCost: parseFloat(material.unitCost),
        subtotal,
      });
      totalAmount += subtotal;

    } else if (item.itemType === 'booth') {
      const service = await req.db.service.findUnique({ where: { id: parseInt(item.serviceId) } });
      if (!service) throw new AppError('Service not found', 404);
      
      validatedItems.push({
        itemType: 'booth',
        serviceId: service.id,
        unitPrice: parseFloat(service.price),
        subtotal: parseFloat(service.price),
      });
      totalAmount += parseFloat(service.price);
    }
  }

  // Update Transaction
  const result = await req.db.$transaction(async (tx) => {
    // 1. Reverse OLD inventory
    if (reverseInventory) {
      for (const item of existingSale.items) {
        if (item.itemType === 'material') {
          let quantityToAddBack = parseFloat(item.quantity);
          
          // Check if old item used a unit
          if (item.materialUnitId) {
             const unit = await tx.materialUnit.findUnique({ where: { id: item.materialUnitId }});
             if (unit) quantityToAddBack = quantityToAddBack * parseFloat(unit.factor);
          }

          await tx.material.update({
            where: { id: item.materialId },
            data: { quantity: { increment: quantityToAddBack } },
          });
        }
      }
    }

    // 2. Delete existing items
    await tx.saleItem.deleteMany({ where: { saleId: parseInt(id) } });

    // 3. Update sale header
    const saleUpdateData = {
      totalAmount,
      paymentMethod: paymentMethod || existingSale.paymentMethod,
    };
    if (saleDate) saleUpdateData.saleDate = new Date(saleDate);

    const updatedSale = await tx.sale.update({
      where: { id: parseInt(id) },
      data: saleUpdateData,
    });

    // 4. Create NEW items & Deduct NEW inventory
    for (const item of validatedItems) {
      const { quantityToDeduct, ...itemData } = item; // Extract helper

      await tx.saleItem.create({
        data: { saleId: updatedSale.id, ...itemData },
      });

      if (item.itemType === 'material') {
        await tx.material.update({
          where: { id: item.materialId },
          data: { quantity: { decrement: quantityToDeduct } },
        });
      }
    }

    // 5. Update Receipt
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

    // 6. Audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Sale',
        entityId: parseInt(id),
        description: `Updated sale #${id}. New total: ${totalAmount}.`,
      },
    });

    return updatedSale;
  });

  const completeSale = await req.db.sale.findUnique({
    where: { id: parseInt(id) },
    include: { items: true, receipt: true },
  });

  res.status(200).json({ success: true, data: completeSale });
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
  const sale = await req.db.sale.findUnique({
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
  const result = await req.db.$transaction(async (tx) => {
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
  const finalSale = await req.db.sale.findUnique({
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
  let { status, startDate, endDate, paymentMethod, paymentStatus, itemType, soldBy, page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const where = {};

  // Security Override for Non-Admins
  if (req.user.role !== 'admin') {
    const today = new Date();
    startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    
    // Enforce own-sales only if applicable
    if (req.isOwnResource) {
      where.soldBy = req.user.id;
    }
  }
  
if (status) where.status = status;

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

  if (itemType) {
    where.items = {
      some:{
        itemType: itemType
      }
    };
  }

  // Filter by payment method
  if (paymentMethod) where.paymentMethod = paymentMethod;

  // 2. FILTER BY PAYMENT STATUS (Paid, Partial, Unpaid)
  if (paymentStatus) where.paymentStatus = paymentStatus;  

  // Filter by seller
  if (soldBy) where.soldBy = parseInt(soldBy);

  // If user only has viewOwn permission, filter to their sales
  if (req.isOwnResource) where.soldBy = req.user.id;
 

  // 3. UPDATE TRANSACTION (Added 'statusStats' as the 5th item)
  const [sales, totalCount, revenueAgg, paymentStats, statusStats] = await req.db.$transaction([
    // Query 1: Get Sales
    req.db.sale.findMany({
      where,
      skip: skip,
      take: limitNumber,
      include: {
        items: {
          include: {
            materialUnit: true,
            material: {select: { name: true }}
          }
        },
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
    req.db.sale.count({ where }),

    // Query 3: Revenue
    req.db.sale.aggregate({
      _sum: { totalAmount: true },
      where,
    }),

    // Query 4: Group by Payment Method
    req.db.sale.groupBy({
      by: ['paymentMethod'],
      _count: { paymentMethod: true },
      where,
    }),

    // Query 5: Group by Payment Status (NEW)
    req.db.sale.groupBy({
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

  const sale = await req.db.sale.findUnique({
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
          materialUnit: true,
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

  const sale = await req.db.sale.findUnique({
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
  await req.db.$transaction(async (tx) => {
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
  let { startDate, endDate } = req.query;
  const where = { status: 'completed' };

  // SECURITY OVERRIDE: If not admin, strictly limit to TODAY
  if (req.user.role !== 'admin') {
    const today = new Date();
    startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // If the user's permission only allows them to view their OWN resources, enforce it
    if (req.isOwnResource) {
      where.soldBy = req.user.id;
    }
  }


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
    req.db.sale.aggregate({
      where,
      _sum: { totalAmount: true },
      _count: true,
    }),

    // Sales by payment method
    req.db.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { totalAmount: true },
      _count: true,
    }),

    // Recent sales
    req.db.sale.findMany({
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