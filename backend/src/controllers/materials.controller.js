import { randomUUID } from 'crypto';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { notifyVendor } from '../utils/notifyVendor.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private (requires 'materials:view' permission)
export const getMaterials = asyncHandler(async (req, res) => {
  const { status, lowStock } = req.query;

  const where = {};
  
  // Filter by active/inactive status
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  
  const materials = await req.db.material.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      alternateUnits: true,
      reorders: {
        where: { status: 'received' },
        orderBy: { receivedDate: 'desc' },
        take: 1,
        select: { receivedDate: true },
      },
    },
  });

  // Filter low stock items if requested
  // let result = materials;
  // if (lowStock === 'true') {
  //   result = materials.filter(m => m.quantity <= m.lowStockThreshold);
  // }

  res.status(200).json({
    success: true,
    count: materials.length,
    data: materials,
  });
});

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private (requires 'materials:view' permission)
export const getMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const material = await req.db.material.findUnique({
    where: { id: parseInt(id) },
    include: {
      alternateUnits: true,
      reorders: {
        orderBy: { reorderDate: 'desc' },
        take: 5, // Last 5 reorders
        include: {
          user: {
            select: { fullName: true, username: true },
          },
          materialUnit: true        },
      },
    },
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  // Add low stock flag
  const isLowStock = material.quantity <= material.lowStockThreshold;

  res.status(200).json({
    success: true,
    data: {
      ...material,
      isLowStock,
    },
  });
});

// @desc    Create new material
// @route   POST /api/materials
// @access  Private (requires 'materials:create' permission)
export const createMaterial = asyncHandler(async (req, res) => {
  const {
    name,
    quantity = 0.0,
    unitCost,
    sellingPrice,
    lowStockThreshold = 3,
    imageUrl,
    baseUnit,
    materialUnitId,
    alternateUnits = [], // Expecting array of { name, conversionFactor }
  } = req.body;

  // Validation
  if (!name || !unitCost || !sellingPrice) {
    throw new AppError(
      'Please provide name, unit cost, and selling price',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (unitCost <= 0 || sellingPrice <= 0) {
    throw new AppError(
      'Unit cost and selling price must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (quantity < 0) {
    throw new AppError('Quantity cannot be negative', 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate name
  const existingMaterial = await req.db.material.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existingMaterial) {
    throw new AppError(
      'Material with this name already exists',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  // Prepare alternate units data if provided
  const unitCreateData = alternateUnits.map(unit => ({
    name: unit.name,
    factor: parseFloat(unit.factor),
    price: parseFloat(unit.price),
    unitId: parseInt(unit.unitId)
  }))

  const material = await req.db.material.create({
    data: {
      name: name.trim(),
      quantity: parseFloat(quantity),
      unitCost: parseFloat(unitCost),
      sellingPrice: parseFloat(sellingPrice),
      lowStockThreshold: parseFloat(lowStockThreshold),
      imageUrl: imageUrl || null,
      baseUnit: baseUnit,
      alternateUnits: {
        create: unitCreateData,
      },
    },
    include: {
      alternateUnits: true,
    },
  });

  // Log audit
  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Material',
      entityId: material.id,
      description: `Created material: ${material.name}`,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Material created successfully',
    data: material,
  });
});

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private (requires 'materials:edit' permission)
export const updateMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    unitCost,
    sellingPrice,
    lowStockThreshold,
    quantity,
    isActive,
    imageUrl,
    baseUnit,
    alternateUnits,
  } = req.body;

  const material = await req.db.material.findUnique({
    where: { id: parseInt(id) },
    include: { alternateUnits: true }
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  // Validation
  if (unitCost !== undefined && unitCost <= 0) {
    throw new AppError('Unit cost must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  if (sellingPrice !== undefined && sellingPrice <= 0) {
    throw new AppError('Selling price must be greater than 0', 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate name (if name is being changed)
  if (name && name !== material.name) {
    const existingMaterial = await req.db.material.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        id: { not: parseInt(id) },
      },
    });

    if (existingMaterial) {
      throw new AppError(
        'Material with this name already exists',
        400,
        'DUPLICATE_ENTRY'
      );
    }
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (baseUnit) updateData.baseUnit = baseUnit;
  if (unitCost !== undefined) updateData.unitCost = parseFloat(unitCost);
  if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);
  if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseFloat(lowStockThreshold);
  if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
// Status Toggle Logic
  if (isActive !== undefined) {
    const newStatus = Boolean(isActive);
    
    // Check if we are transitioning from INACTIVE (false) to ACTIVE (true)
    if (newStatus === true && material.isActive === false) {
      updateData.quantity = 0; // FORCE reset to 0 on reactivation
      updateData.isActive = true;
    } else {
      updateData.isActive = newStatus;
    }
  }
  // --- UNIT SYNCHRONIZATION LOGIC ---
  // We use a transaction to ensure units and material details are updated safely
  const result = await req.db.$transaction(async (tx) => {
    // 1. Update Base Material
    const updatedMat = await tx.material.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // 2. Handle Alternate Units if provided
    if (alternateUnits && Array.isArray(alternateUnits)) {
      // IDs from the frontend payload
      const incomingIds = alternateUnits
        .filter(u => u.id)
        .map(u => parseInt(u.id));

      // IDs currently in database
      const existingIds = material.alternateUnits.map(u => u.id);

      // A. Delete units that are in DB but missing from payload
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        await tx.materialUnit.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }

      // B. Upsert (Update existing / Create new)
      for (const unit of alternateUnits) {
        if (unit.id) {
          // Update existing
          await tx.materialUnit.update({
            where: { id: parseInt(unit.id) },
            data: {
              name: unit.name,
              factor: parseFloat(unit.factor),
              price: parseFloat(unit.price)
            }
          });
        } else {
          // Create new
          await tx.materialUnit.create({
            data: {
              materialId: parseInt(id),
              name: unit.name,
              factor: parseFloat(unit.factor),
              price: parseFloat(unit.price)
            }
          });
        }
      }
    }

    return updatedMat;
  });
  // const updatedMaterial = await req.db.material.update({
  //   where: { id: parseInt(id) },
  //   data: updateData,
  // });

  // Log audit
  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Material',
      entityId: result.id,
      description: `Updated material: ${result.name}`,
    },
  });

  // Fetch fresh data including units to return
  const finalMaterial = await req.db.material.findUnique({
    where: { id: parseInt(id) },
    include: { alternateUnits: true }
  });

  res.status(200).json({
    success: true,
    message: 'Material updated successfully',
    data: finalMaterial,
  });
});

// @desc    Delete material (soft delete - set inactive)
// @route   DELETE /api/materials/:id
// @access  Private (requires 'materials:delete' permission)
export const deleteMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const materialId = parseInt(id);

  const material = await req.db.material.findUnique({
    where: { id: materialId },
    include: {
      reorders: {
        select: { expenseId: true }
      },
      _count: {
        select: {
          saleItems: true,
          jobMaterials: true,
        },
      },
    },
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  // Extract all expense IDs linked to this material's reorders
  const expenseIds = material.reorders
    .map(r => r.expenseId)
    .filter(id => id !== null);

  await req.db.$transaction(async (tx) => {
    // 1. Delete associated Expenses (COGS)
    if (expenseIds.length > 0) {
      await tx.expense.deleteMany({
        where: { id: { in: expenseIds } }
      });
    }

    // 2. Delete all Material Reorder records
    await tx.materialReorder.deleteMany({
      where: { materialId: materialId }
    });

    // 3. Handle the Material Status
    // If it has sales/jobs history, we MUST keep the record but deactivate it
    if (material._count.saleItems > 0 || material._count.jobMaterials > 0) {
      await tx.material.update({
        where: { id: materialId },
        data: { 
          isActive: false, 
          quantity: 0  // Reset quantity to 0 as requested
        },
      });
      
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DEACTIVATE_CLEANUP',
          entity: 'Material',
          entityId: materialId,
          description: `Deactivated ${material.name}: Reset quantity to 0 and deleted COGS history.`,
        },
      });
    } else {
      // If no sales/jobs history at all, we can safely hard delete the material
      await tx.material.delete({
        where: { id: materialId },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE_CLEANUP',
          entity: 'Material',
          entityId: materialId,
          description: `Hard deleted ${material.name} and all related purchase history.`,
        },
      });
    }
  });

  res.status(200).json({
    success: true,
    message: 'Material deactivated, stock reset, and financial records cleaned.',
  });
});

// @desc    Get low stock materials
// @route   GET /api/materials/low-stock
// @access  Private (requires 'materials:view' permission)
export const getLowStockMaterials = asyncHandler(async (req, res) => {
  const materials = await req.db.material.findMany({
    where: { isActive: true },
    orderBy: { quantity: 'asc' },
    include: { alternateUnits: true }
  });

  // FIX: Convert to Number() before comparing
  const lowStockMaterials = materials.filter(
    m => Number(m.quantity) <= Number(m.lowStockThreshold)
  );

  res.status(200).json({
    success: true,
    count: lowStockMaterials.length,
    data: lowStockMaterials,
  });
});

// @desc    Reorder material
// @route   POST /api/materials/:id/reorder
// @access  Private (requires 'materials:reorder' permission)
export const reorderMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantityOrdered, unitCost, notes, unitId, vendorId } = req.body;

  if (!quantityOrdered || quantityOrdered <= 0) {
    throw new AppError('Quantity ordered must be greater than 0', 400);
  }

  const material = await req.db.material.findUnique({
    where: { id: parseInt(id) },
    include: { alternateUnits: true },
  });

  if (!material) throw new AppError('Material not found', 404);
  if (!material.isActive) throw new AppError('Cannot reorder inactive material', 400);

  let purchaseQty = parseFloat(quantityOrdered);
  let conversionFactor = 1;
  let finalUnitId = null;

  if (unitId) {
    const selectedUnit = material.alternateUnits.find(u => u.unitId === parseInt(unitId));
    if (selectedUnit) {
      finalUnitId = selectedUnit.unitId;
      conversionFactor = parseFloat(selectedUnit.factor);
    }
  }

  let purchaseUnitCost;
  if (unitCost) {
    purchaseUnitCost = parseFloat(unitCost);
  } else {
    purchaseUnitCost = parseFloat(material.unitCost) * conversionFactor;
  }

  const totalCost = purchaseQty * purchaseUnitCost;

  // Load vendor for notification (if provided)
  let vendor = null;
  if (vendorId) {
    vendor = await req.db.vendor.findFirst({
      where: { id: parseInt(vendorId), businessId: req.user.businessId },
    });
  }

  const orderId = randomUUID();

  const result = await req.db.$transaction(async (tx) => {
    const reorder = await tx.materialReorder.create({
      data: {
        materialId: material.id,
        materialName: material.name,
        materialUnitId: finalUnitId,
        quantityOrdered: purchaseQty,
        unitCost: purchaseUnitCost,
        totalCost,
        reorderedBy: req.user.id,
        notes,
        status: 'pending',
        vendorId: vendor?.id || null,
        businessId: req.user.businessId,
        orderId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REORDER',
        entity: 'Material',
        entityId: material.id,
        description: `Order placed for ${purchaseQty} of ${material.name}. Awaiting receipt.`,
      },
    });

    return reorder;
  });

  // Notify vendor (non-blocking)
  if (vendor) {
    const business = await req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } });
    notifyVendor(vendor, {
      items: [{ materialName: material.name, quantityOrdered: purchaseQty, unit: finalUnitId ? 'units' : material.baseUnit, unitCost: purchaseUnitCost }],
      totalCost,
      businessName: business?.name || 'The workshop',
      orderedBy: req.user.fullName || req.user.username,
      businessId: req.user.businessId,
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: 'Restock order placed. Stock will update when goods are received.',
    data: result,
  });
});

// @desc    Bulk Reorder materials (places orders — stock deferred until receipt)
// @route   POST /api/materials/bulk-reorder
// @access  Private
export const bulkReorderMaterials = asyncHandler(async (req, res) => {
  const { items, vendorId, notes: orderNotes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('No items provided for reorder', 400);
  }

  const itemIds = items.map(item => parseInt(item.id));
  const materials = await req.db.material.findMany({
    where: { id: { in: itemIds } },
    include: { alternateUnits: true },
  });

  const materialMap = new Map(materials.map(m => [m.id, m]));

  // Load vendor if provided
  let vendor = null;
  if (vendorId) {
    vendor = await req.db.vendor.findFirst({
      where: { id: parseInt(vendorId), businessId: req.user.businessId },
    });
  }

  const orderId = randomUUID();

  const results = await req.db.$transaction(async (tx) => {
    const processedItems = [];

    for (const item of items) {
      const materialId = parseInt(item.id);
      const material = materialMap.get(materialId);

      if (!material) throw new AppError(`Material ID ${materialId} not found`, 404);
      if (!material.isActive) throw new AppError(`Material ${material.name} is inactive`, 400);

      let purchaseQty = parseFloat(item.quantityOrdered);
      let conversionFactor = 1;
      let finalUnitId = null;

      if (item.unitId) {
        const selectedUnit = material.alternateUnits.find(u => u.unitId === parseInt(item.unitId));
        if (selectedUnit) {
          finalUnitId = selectedUnit.unitId;
          conversionFactor = parseFloat(selectedUnit.factor);
        }
      }

      if (isNaN(purchaseQty) || purchaseQty <= 0) {
        throw new AppError(`Invalid quantity for ${material.name}`, 400);
      }

      let purchaseUnitCost;
      if (item.unitCost) {
        purchaseUnitCost = parseFloat(item.unitCost);
      } else {
        purchaseUnitCost = parseFloat(material.unitCost) * conversionFactor;
      }

      const totalCost = purchaseUnitCost * purchaseQty;

      const reorder = await tx.materialReorder.create({
        data: {
          materialId: material.id,
          materialName: material.name,
          materialUnitId: finalUnitId,
          quantityOrdered: purchaseQty,
          unitCost: purchaseUnitCost,
          totalCost,
          reorderedBy: req.user.id,
          notes: item.notes || orderNotes || null,
          status: 'pending',
          vendorId: vendor?.id || null,
          businessId: req.user.businessId,
          orderId,
        },
      });

      processedItems.push({
        reorderId: reorder.id,
        materialName: material.name,
        quantityOrdered: purchaseQty,
        unit: finalUnitId ? 'units' : material.baseUnit,
        unitCost: purchaseUnitCost,
        totalCost,
      });
    }

    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BULK_REORDER',
        entity: 'Material',
        description: `Restock order placed for ${processedItems.length} item(s). Awaiting receipt.`,
      },
    });

    return processedItems;
  });

  // Notify vendor (non-blocking)
  if (vendor) {
    const business = await req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } });
    const grandTotal = results.reduce((sum, i) => sum + i.totalCost, 0);
    notifyVendor(vendor, {
      items: results,
      totalCost: grandTotal,
      businessName: business?.name || 'The workshop',
      orderedBy: req.user.fullName || req.user.username,
      businessId: req.user.businessId,
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message: `Restock order placed for ${results.length} item(s). Stock will update when goods are received.`,
    data: results,
  });
});

// @desc    Get all restock orders for the business (grouped by orderId)
// @route   GET /api/materials/restock-orders
// @access  Private
export const getRestockOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // Always fetch all records — we group in JS and filter groups by status
  const lineItems = await req.db.materialReorder.findMany({
    where: { businessId: req.user.businessId },
    orderBy: { reorderDate: 'desc' },
    include: {
      material: { select: { name: true, baseUnit: true } },
      materialUnit: { select: { name: true } },
      vendor: { select: { id: true, companyName: true, contactName: true } },
      user: { select: { fullName: true, username: true } },
      receivedUser: { select: { fullName: true, username: true } },
    },
  });

  // Group by orderId; records without orderId (legacy) each form their own group
  const groupMap = new Map();
  for (const item of lineItems) {
    const key = item.orderId || `__legacy__${item.id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        orderId: item.orderId || null,
        reorderDate: item.reorderDate,
        vendor: item.vendor,
        user: item.user,
        notes: item.notes,
        businessId: item.businessId,
        items: [],
        totalCost: 0,
        // Will be computed below
        status: 'received',
        paymentStatus: item.paymentStatus,
        receivedDate: item.receivedDate,
        receivedUser: item.receivedUser,
      });
    }
    const group = groupMap.get(key);
    group.items.push(item);
    group.totalCost += parseFloat(item.totalCost);
    // If ANY item is still pending, the whole order is pending
    if (item.status === 'pending') {
      group.status = 'pending';
      group.receivedDate = null;
      group.receivedUser = null;
    }
    // Track latest reorderDate for display
    if (item.reorderDate > group.reorderDate) {
      group.reorderDate = item.reorderDate;
    }
  }

  let groups = Array.from(groupMap.values());

  // Apply status filter at group level
  if (status && status !== 'all') {
    groups = groups.filter(g => g.status === status);
  }

  // Sort newest first
  groups.sort((a, b) => new Date(b.reorderDate) - new Date(a.reorderDate));

  res.status(200).json({ success: true, data: groups });
});

// @desc    Mark all items in a restock order as received — updates stock, logs expenses
// @route   POST /api/materials/restock-orders/:orderId/receive
// @access  Private
export const receiveRestockOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { markAsPaid } = req.body;

  // Find all pending line items for this order
  const lineItems = await req.db.materialReorder.findMany({
    where: { orderId, businessId: req.user.businessId, status: 'pending' },
    include: { material: { include: { alternateUnits: true } }, vendor: true },
  });

  if (lineItems.length === 0) {
    throw new AppError('No pending items found for this order', 404);
  }

  const receivedAt = new Date();

  const result = await req.db.$transaction(async (tx) => {
    const processed = [];

    for (const order of lineItems) {
      // Recalculate conversion factor
      let conversionFactor = 1;
      let newBaseUnitCost = parseFloat(order.unitCost);

      if (order.materialUnitId) {
        const selectedUnit = order.material.alternateUnits.find(u => u.unitId === order.materialUnitId);
        if (selectedUnit) {
          conversionFactor = parseFloat(selectedUnit.factor);
          newBaseUnitCost = parseFloat(order.unitCost) / conversionFactor;
        }
      }

      const stockToAdd = parseFloat(order.quantityOrdered) * conversionFactor;

      // Update stock quantity and unit cost
      await tx.material.update({
        where: { id: order.materialId },
        data: {
          quantity: { increment: stockToAdd },
          unitCost: newBaseUnitCost,
        },
      });

      // Auto-log expense (read-only, system-generated)
      const expense = await tx.expense.create({
        data: {
          type: 'cog',
          category: 'material_reorder',
          description: `Restock received: ${order.materialName}`,
          amount: order.totalCost,
          expenseDate: receivedAt,
          source: 'system',
          isReadOnly: true,
          recordedBy: req.user.id,
          businessId: req.user.businessId,
        },
      });

      // Mark line item as received
      await tx.materialReorder.update({
        where: { id: order.id },
        data: {
          status: 'received',
          receivedDate: receivedAt,
          receivedBy: req.user.id,
          expenseId: expense.id,
          ...(markAsPaid ? { paymentStatus: 'paid' } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'RECEIVE_RESTOCK',
          entity: 'Material',
          entityId: order.materialId,
          description: `Received ${order.quantityOrdered} of ${order.materialName}. Added ${stockToAdd} base units to stock.`,
        },
      });

      processed.push({ materialName: order.materialName, stockAdded: stockToAdd });
    }

    return processed;
  });

  // Notify vendor that their delivery has been received (non-blocking)
  const vendor = lineItems[0]?.vendor;
  if (vendor) {
    const business = await req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } });
    const itemSummary = lineItems.map(i => i.materialName).join(', ');
    notifyVendor(vendor, {
      businessId: req.user.businessId,
      customMessage: `Dear ${vendor.contactName || vendor.companyName}, your delivery (Order ${orderId}) has been received: ${itemSummary}. Thank you. – ${business?.name || 'The Workshop'}`,
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `${result.length} item(s) received. Stock updated.`,
    data: result,
  });
});


// @desc    Mark all items in a restock order as paid to the vendor
// @route   POST /api/materials/restock-orders/:orderId/mark-paid
// @access  Private
export const markRestockOrderPaid = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const items = await req.db.materialReorder.findMany({
    where: { orderId, businessId: req.user.businessId },
  });

  if (items.length === 0) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (items[0].paymentStatus === 'paid') {
    throw new AppError('Order is already marked as paid', 400, 'INVALID_OPERATION');
  }

  await req.db.materialReorder.updateMany({
    where: { orderId, businessId: req.user.businessId },
    data: { paymentStatus: 'paid' },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'MARK_RESTOCK_PAID',
      entity: 'MaterialReorder',
      entityId: items[0].materialId,
      description: `Marked restock order ${orderId} as paid to vendor.`,
    },
  });

  res.status(200).json({ success: true, message: 'Order marked as paid.' });
});

// @desc    Admin: update quantities/costs on a pending restock order
// @route   PUT /api/materials/restock-orders/:orderId
// @access  Private (Admin only)
export const updateRestockOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body; // [{ id, quantityOrdered, unitCost }]

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items array is required', 400, 'VALIDATION_ERROR');
  }

  const lineItems = await req.db.materialReorder.findMany({
    where: { orderId, businessId: req.user.businessId },
  });

  if (lineItems.length === 0) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const hasReceived = lineItems.some(i => i.status === 'received');
  if (hasReceived) {
    throw new AppError('Cannot edit an order that has already been received', 400, 'INVALID_OPERATION');
  }

  const hasCancelled = lineItems.every(i => i.status === 'cancelled');
  if (hasCancelled) {
    throw new AppError('Cannot edit a cancelled order', 400, 'INVALID_OPERATION');
  }

  const lineItemMap = new Map(lineItems.map(i => [i.id, i]));

  const updated = await req.db.$transaction(async (tx) => {
    const results = [];
    for (const { id, quantityOrdered, unitCost } of items) {
      if (!lineItemMap.has(id)) continue;
      const qty = parseFloat(quantityOrdered);
      const cost = parseFloat(unitCost);
      if (qty <= 0 || cost <= 0) continue;
      const totalCost = qty * cost;
      const result = await tx.materialReorder.update({
        where: { id },
        data: { quantityOrdered: qty, unitCost: cost, totalCost },
      });
      results.push(result);
    }
    return results;
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'MaterialReorder',
      businessId: req.user.businessId,
      description: `Admin updated pending restock order ${orderId}: ${updated.length} item(s) adjusted`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Restock order updated',
    data: { orderId, updatedItems: updated.length },
  });
});

// @desc    Admin: cancel a pending restock order
// @route   PUT /api/materials/restock-orders/:orderId/cancel
// @access  Private (Admin only)
export const cancelRestockOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const lineItems = await req.db.materialReorder.findMany({
    where: { orderId, businessId: req.user.businessId },
  });

  if (lineItems.length === 0) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  const hasReceived = lineItems.some(i => i.status === 'received');
  if (hasReceived) {
    throw new AppError('Cannot cancel an order that has already been received', 400, 'INVALID_OPERATION');
  }

  // Expenses are only created when received, so no expense cleanup needed for pending orders
  await req.db.materialReorder.updateMany({
    where: { orderId, businessId: req.user.businessId },
    data: { status: 'cancelled' },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CANCEL',
      entity: 'MaterialReorder',
      businessId: req.user.businessId,
      description: `Admin cancelled restock order ${orderId} (${lineItems.length} item(s))`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Restock order cancelled',
  });
});

// @desc    Admin: correct quantities/costs on an already-received restock order
// @route   PUT /api/materials/restock-orders/:orderId/admin-correct
// @access  Private (Admin only)
export const adminEditReceivedOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    throw new AppError('items array is required', 400, 'VALIDATION_ERROR');

  const lineItems = await req.db.materialReorder.findMany({
    where: { orderId, businessId: req.user.businessId },
    include: { material: { include: { alternateUnits: true } } },
  });

  if (!lineItems.length) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (lineItems.some(i => i.status !== 'received'))
    throw new AppError('This endpoint is only for received orders', 400, 'INVALID_OPERATION');

  const lineItemMap = new Map(lineItems.map(i => [i.id, i]));

  const results = await req.db.$transaction(async (tx) => {
    const processed = [];
    for (const { id, quantityOrdered, unitCost } of items) {
      const existing = lineItemMap.get(id);
      if (!existing) continue;

      const newQty  = parseFloat(quantityOrdered);
      const newCost = parseFloat(unitCost);
      if (isNaN(newQty) || newQty <= 0) continue;
      if (isNaN(newCost) || newCost < 0) continue;

      let conversionFactor = 1;
      if (existing.materialUnitId) {
        const unit = existing.material.alternateUnits
          .find(u => u.unitId === existing.materialUnitId);
        if (unit) conversionFactor = parseFloat(unit.factor);
      }

      const oldBaseStock = parseFloat(existing.quantityOrdered) * conversionFactor;
      const newBaseStock = newQty * conversionFactor;
      const stockDelta   = newBaseStock - oldBaseStock;
      const newTotalCost = newQty * newCost;

      await tx.materialReorder.update({
        where: { id },
        data: { quantityOrdered: newQty, unitCost: newCost, totalCost: newTotalCost },
      });

      if (stockDelta !== 0) {
        await tx.material.update({
          where: { id: existing.materialId },
          data: { quantity: { increment: stockDelta } },
        });
      }

      if (existing.expenseId) {
        await tx.expense.update({
          where: { id: existing.expenseId },
          data: { amount: newTotalCost },
        });
      }

      processed.push({
        materialName: existing.materialName,
        oldQty: parseFloat(existing.quantityOrdered),
        newQty,
        oldCost: parseFloat(existing.unitCost),
        newCost,
        stockDelta,
      });
    }
    return processed;
  });

  const auditLines = results.map(r =>
    `${r.materialName}: qty ${r.oldQty}→${r.newQty}, cost ${r.oldCost}→${r.newCost}, stock Δ${r.stockDelta >= 0 ? '+' : ''}${r.stockDelta}`
  ).join('; ');

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'ADMIN_EDIT_RECEIVED_ORDER',
      entity: 'MaterialReorder',
      businessId: req.user.businessId,
      description: `Admin corrected received order ${orderId}: ${auditLines}`,
    },
  });

  res.status(200).json({
    success: true,
    message: `${results.length} item(s) corrected. Stock and expense records updated.`,
    data: { orderId, correctedItems: results.length },
  });
});

// @desc    Get material reorder history
// @route   GET /api/materials/:id/reorders
// @access  Private (requires 'materials:view' permission)
export const getMaterialReorders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const material = await req.db.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  const reorders = await req.db.materialReorder.findMany({
    where: { materialId: parseInt(id) },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      materialUnit: {
        select: { name: true, factor: true },
      },
      expense: {
        select: {
          id: true,
          amount: true,
          expenseDate: true,
        },
      },
    },
    orderBy: { reorderDate: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: reorders.length,
    data: reorders,
  });
});

// @desc    Get inventory snapshot — stock levels at a given date
// @route   GET /api/materials/snapshot?date=YYYY-MM-DD
// @access  Private
export const getInventorySnapshot = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const snapshotDate = req.query.date ? new Date(req.query.date) : (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1); // First of current month
  })();

  // End of the snapshot day (inclusive)
  const snapshotEnd = new Date(snapshotDate);
  snapshotEnd.setHours(23, 59, 59, 999);

  // All active materials for this business
  const materials = await req.db.material.findMany({
    where: { businessId, isActive: true },
    select: { id: true, name: true, baseUnit: true, quantity: true },
    orderBy: { name: 'asc' },
  });

  // Aggregate all reorders up to snapshot date
  const reorders = await req.db.materialReorder.groupBy({
    by: ['materialId'],
    where: {
      businessId,
      reorderDate: { lte: snapshotEnd },
    },
    _sum: { quantityOrdered: true },
  });
  const reorderMap = {};
  for (const r of reorders) {
    reorderMap[r.materialId] = parseFloat(r._sum.quantityOrdered || 0);
  }

  // Aggregate all sales outflows up to snapshot date (base units)
  const sales = await req.db.saleItem.groupBy({
    by: ['materialId'],
    where: {
      businessId,
      materialId: { not: null },
      sale: { createdAt: { lte: snapshotEnd } },
    },
    _sum: { quantity: true },
  });
  const salesMap = {};
  for (const s of sales) {
    if (s.materialId) salesMap[s.materialId] = parseFloat(s._sum.quantity || 0);
  }

  // Aggregate job material usage up to snapshot date (internal stock only)
  const jobUsage = await req.db.jobMaterial.groupBy({
    by: ['materialId'],
    where: {
      businessId,
      materialId: { not: null },
      isExternal: false,
      job: { createdAt: { lte: snapshotEnd } },
    },
    _sum: { quantity: true },
  });
  const jobMap = {};
  for (const j of jobUsage) {
    if (j.materialId) jobMap[j.materialId] = parseFloat(j._sum.quantity || 0);
  }

  const snapshot = materials.map((m) => {
    const totalIn = reorderMap[m.id] || 0;
    const soldOut = salesMap[m.id] || 0;
    const jobUsed = jobMap[m.id] || 0;
    const stockAtDate = Math.max(0, totalIn - soldOut - jobUsed);
    const current = parseFloat(m.quantity);
    return {
      id: m.id,
      name: m.name,
      baseUnit: m.baseUnit,
      stockAtDate: parseFloat(stockAtDate.toFixed(2)),
      currentStock: parseFloat(current.toFixed(2)),
      change: parseFloat((current - stockAtDate).toFixed(2)),
    };
  });

  res.status(200).json({
    success: true,
    snapshotDate: snapshotDate.toISOString().split('T')[0],
    data: snapshot,
  });
});


// @desc    Reorder material
// // @route   POST /api/materials/:id/reorder
// // @access  Private (requires 'materials:reorder' permission)
// export const reorderMaterial = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const { quantityOrdered, unitCost, notes, unitId } = req.body;

//   // Validation
//   if (!quantityOrdered || quantityOrdered <= 0) {
//     throw new AppError(
//       'Quantity ordered must be greater than 0',
//       400,
//       'VALIDATION_ERROR'
//     );
//   }

//   const material = await req.db.material.findUnique({
//     where: { id: parseInt(id) },
//     include: { alternateUnits: true },
//   });

//   if (!material) {
//     throw new AppError('Material not found', 404, 'NOT_FOUND');
//   }

//   if (!material.isActive) {
//     throw new AppError(
//       'Cannot reorder inactive material',
//       400,
//       'INVALID_OPERATION'
//     );
//   }

//   // --- UNIT CONVERSION LOGIC ---
//   let qtyToAdd = parseFloat(quantityOrdered);
//   let finalUnitId = null;
//   let conversionFactor = 1;

//   if (unitId) {
//     const selectedUnit = material.alternateUnits.find(u => u.id === parseInt(unitId));
//     if (!selectedUnit) {
//       throw new AppError('Selected unit not found for this material', 400);
//     }
    
//     finalUnitId = selectedUnit.id;
//     conversionFactor = parseFloat(selectedUnit.factor);
    
//     // Calculate total base units to add to stock
//     // e.g., 5 Drums * 200 Liters/Drum = 1000 Liters
//     qtyToAdd = parseFloat(quantityOrdered) * conversionFactor;
//   }

//   // Use provided unit cost or material's current unit cost
//   const reorderUnitCost = unitCost ? parseFloat(unitCost) : Number(material.unitCost);
//   const totalCost = parseFloat(quantityOrdered) * reorderUnitCost;
//   // Start transaction
//   const result = await req.db.$transaction(async (tx) => {
//     // 1. Create reorder record
//     const reorder = await tx.materialReorder.create({
//       data: {
//         materialId: material.id,
//         materialName: material.name,
//         materialUnitId: finalUnitId,
//         quantityOrdered: parseFloat(quantityOrdered),
//         unitCost: reorderUnitCost,
//         totalCost,
//         reorderedBy: req.user.id,
//         notes,
//       },
//     });

//     // 2. Update material quantity and unit cost
//     const updatedMaterial = await tx.material.update({
//       where: { id: material.id },
//       data: {
//         quantity: { increment: qtyToAdd },
//         unitCost: reorderUnitCost, // Update to new cost
//       },
//     });

//     // 3. Create COGS expense (system-generated, read-only)
//     // const expense = await tx.expense.create({
//     //   data: {
//     //     type: 'cog',
//     //     category: 'material_reorder',
//     //     description: `Material reorder: ${material.name} (${qtyToAdd} units)`,
//     //     amount: totalCost,
//     //     source: 'system',
//     //     isReadOnly: true,
//     //     recordedBy: req.user.id,
//     //     notes: `Auto-generated from reorder #${reorder.id}`,
//     //   },
//     // });

//     // 4. Link expense to reorder
//     // await tx.materialReorder.update({
//     //   where: { id: reorder.id },
//     //   data: { expenseId: expense.id },
//     // });

//     // 5. Log audit
//     await tx.auditLog.create({
//       data: {
//         userId: req.user.id,
//         action: 'REORDER',
//         entity: 'Material',
//         entityId: material.id,
//         description: `Reordered ${quantityOrdered} ${finalUnitId ? 'Units' : 'Base Units'} of ${material.name}. Added ${qtyToAdd} to stock.`,      },
//     });

//     return { reorder, updatedMaterial /*, expense*/ };
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Material reordered successfully',
//     data: {
//       reorder: result.reorder,
//       material: result.updatedMaterial,
//     },
//   });
// });

// // @desc    Bulk Reorder materials
// // @route   POST /api/materials/bulk-reorder
// // @access  Private (requires 'materials:reorder' permission)
// export const bulkReorderMaterials = asyncHandler(async (req, res) => {
//   const { items } = req.body;

//   if (!Array.isArray(items) || items.length === 0) {
//     throw new AppError('No items provided for reorder', 400, 'VALIDATION_ERROR');
//   }

//   // 1. Extract IDs and fetch all materials in one query for efficiency
//   const itemIds = items.map(item => parseInt(item.id));
//   const materials = await req.db.material.findMany({
//     where: { id: { in: itemIds } },
//     include: { alternateUnits: true },
//   });

//   // 2. Map materials for quick access
//   const materialMap = new Map(materials.map(m => [m.id, m]));

//   // 3. Start Transaction
//   const results = await req.db.$transaction(async (tx) => {
//     const processedItems = [];

//     for (const item of items) {
//       const materialId = parseInt(item.id);
//       const material = materialMap.get(materialId);

//       // Validation within transaction
//       if (!material) throw new AppError(`Material ID ${materialId} not found`, 404);
//       if (!material.isActive) throw new AppError(`Material ${material.name} is inactive`, 400);
      
//       // --- UNIT CONVERSION LOGIC ---
//       let qtyOrdered = parseFloat(item.quantityOrdered);
//       let qtyToAdd = qtyOrdered;
//       let finalUnitId = null;
//       let conversionFactor = 1;

//       if (item.unitId) {
//         const selectedUnit = material.alternateUnits.find(u => u.id === parseInt(item.unitId));
//         if (selectedUnit) {
//           finalUnitId = selectedUnit.id;
//           conversionFactor = parseFloat(selectedUnit.factor);
//           qtyToAdd = qtyOrdered * conversionFactor;
//         }
//       }

//       if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
//         throw new AppError(`Invalid quantity for ${material.name}`, 400);
//       }

//       const reorderUnitCost = item.unitCost ? parseFloat(item.unitCost) : Number(material.unitCost);
//       const totalCost = reorderUnitCost * qtyToAdd;

//       // A. Create reorder record
//       const reorder = await tx.materialReorder.create({
//         data: {
//           materialId: material.id,
//           materialName: material.name,
//           materialUnitId: finalUnitId,
//           quantityOrdered: qtyToAdd,
//           unitCost: reorderUnitCost,
//           totalCost,
//           reorderedBy: req.user.id,
//           notes: item.notes || 'Bulk Reorder',
//         },
//       });

//       // B. Update material quantity and unit cost
//       const updatedMaterial = await tx.material.update({
//         where: { id: material.id },
//         data: {
//           quantity: { increment: qtyToAdd },
//           unitCost: reorderUnitCost,
//         },
//       });

//       // C. Create COGS expense
//       // const expense = await tx.expense.create({
//       //   data: {
//       //     type: 'cog',
//       //     category: 'material_reorder',
//       //     description: `Bulk Reorder: ${material.name} (${qtyToAdd} units)`,
//       //     amount: totalCost,
//       //     source: 'system',
//       //     isReadOnly: true,
//       //     recordedBy: req.user.id,
//       //     notes: `Auto-generated from bulk reorder item #${reorder.id}`,
//       //   },
//       // });

//       // // D. Link expense to reorder
//       // await tx.materialReorder.update({
//       //   where: { id: reorder.id },
//       //   data: { expenseId: expense.id },
//       // });

//       processedItems.push({ materialName: material.name, totalCost });
//     }

//     // 4. Single Bulk Audit Log
//     await tx.auditLog.create({
//       data: {
//         userId: req.user.id,
//         action: 'BULK_REORDER',
//         entity: 'Material',
//         description: `Bulk reordered ${processedItems.length} items. Total materials updated.`,
//       },
//     });

//     return processedItems;
//   });

//   res.status(201).json({
//     success: true,
//     message: `Successfully restocked ${results.length} materials`,
//     data: results,
//   });
// });