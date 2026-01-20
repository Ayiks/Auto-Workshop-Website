import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private (requires 'materials:view' permission)
export const getMaterials = asyncHandler(async (req, res) => {
  const { status, lowStock } = req.query;

  const where = {};
  
  // Filter by active/inactive status
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  
  const materials = await prisma.material.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  // Filter low stock items if requested
  let result = materials;
  if (lowStock === 'true') {
    result = materials.filter(m => m.quantity <= m.lowStockThreshold);
  }

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
});

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private (requires 'materials:view' permission)
export const getMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
    include: {
      reorders: {
        orderBy: { reorderDate: 'desc' },
        take: 5, // Last 5 reorders
        include: {
          user: {
            select: { fullName: true, username: true },
          },
        },
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
    lowStockThreshold = 10,
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
  const existingMaterial = await prisma.material.findFirst({
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

  const material = await prisma.material.create({
    data: {
      name: name.trim(),
      quantity: parseFloat(quantity),
      unitCost: parseFloat(unitCost),
      sellingPrice: parseFloat(sellingPrice),
      lowStockThreshold: parseFloat(lowStockThreshold),
    },
  });

  // Log audit
  await prisma.auditLog.create({
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
    isActive,
  } = req.body;

  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
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
    const existingMaterial = await prisma.material.findFirst({
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
  if (unitCost !== undefined) updateData.unitCost = parseFloat(unitCost);
  if (sellingPrice !== undefined) updateData.sellingPrice = parseFloat(sellingPrice);
  if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseFloat(lowStockThreshold);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const updatedMaterial = await prisma.material.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Material',
      entityId: updatedMaterial.id,
      description: `Updated material: ${updatedMaterial.name}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Material updated successfully',
    data: updatedMaterial,
  });
});

// @desc    Delete material (soft delete - set inactive)
// @route   DELETE /api/materials/:id
// @access  Private (requires 'materials:delete' permission)
export const deleteMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
    include: {
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

  // Check if material is used in any sales or jobs
  if (material._count.saleItems > 0 || material._count.jobMaterials > 0) {
    // Soft delete - just deactivate
    const deactivatedMaterial = await prisma.material.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE',
        entity: 'Material',
        entityId: deactivatedMaterial.id,
        description: `Deactivated material: ${deactivatedMaterial.name} (has transaction history)`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Material deactivated successfully (has transaction history)',
      data: deactivatedMaterial,
    });
  }

  // Hard delete if no transaction history
  await prisma.material.delete({
    where: { id: parseInt(id) },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Material',
      entityId: parseInt(id),
      description: `Deleted material: ${material.name}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Material deleted successfully',
  });
});

// @desc    Get low stock materials
// @route   GET /api/materials/low-stock
// @access  Private (requires 'materials:view' permission)
export const getLowStockMaterials = asyncHandler(async (req, res) => {
  const materials = await prisma.material.findMany({
    where: { isActive: true },
    orderBy: { quantity: 'asc' },
  });

  const lowStockMaterials = materials.filter(
    m => m.quantity <= m.lowStockThreshold
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
  const { quantityOrdered, unitCost, notes } = req.body;

  // Validation
  if (!quantityOrdered || quantityOrdered <= 0) {
    throw new AppError(
      'Quantity ordered must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  if (!material.isActive) {
    throw new AppError(
      'Cannot reorder inactive material',
      400,
      'INVALID_OPERATION'
    );
  }

  // Use provided unit cost or material's current unit cost
  const reorderUnitCost = unitCost ? parseFloat(unitCost) : material.unitCost;
  const totalCost = reorderUnitCost * parseFloat(quantityOrdered);

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create reorder record
    const reorder = await tx.materialReorder.create({
      data: {
        materialId: material.id,
        materialName: material.name,
        quantityOrdered: parseFloat(quantityOrdered),
        unitCost: reorderUnitCost,
        totalCost,
        reorderedBy: req.user.id,
        notes,
      },
    });

    // 2. Update material quantity and unit cost
    const updatedMaterial = await tx.material.update({
      where: { id: material.id },
      data: {
        quantity: material.quantity + parseFloat(quantityOrdered),
        unitCost: reorderUnitCost, // Update to new cost
      },
    });

    // 3. Create COGS expense (system-generated, read-only)
    const expense = await tx.expense.create({
      data: {
        type: 'cog',
        category: 'material_reorder',
        description: `Material reorder: ${material.name} (${quantityOrdered} units)`,
        amount: totalCost,
        source: 'system',
        isReadOnly: true,
        recordedBy: req.user.id,
        notes: `Auto-generated from reorder #${reorder.id}`,
      },
    });

    // 4. Link expense to reorder
    await tx.materialReorder.update({
      where: { id: reorder.id },
      data: { expenseId: expense.id },
    });

    // 5. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REORDER',
        entity: 'Material',
        entityId: material.id,
        description: `Reordered ${quantityOrdered} units of ${material.name}. Total cost: GH₵${totalCost}`,
      },
    });

    return { reorder, updatedMaterial, expense };
  });

  res.status(201).json({
    success: true,
    message: 'Material reordered successfully',
    data: {
      reorder: result.reorder,
      material: result.updatedMaterial,
      expense: result.expense,
    },
  });
});

// @desc    Get material reorder history
// @route   GET /api/materials/:id/reorders
// @access  Private (requires 'materials:view' permission)
export const getMaterialReorders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throw new AppError('Material not found', 404, 'NOT_FOUND');
  }

  const reorders = await prisma.materialReorder.findMany({
    where: { materialId: parseInt(id) },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
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
