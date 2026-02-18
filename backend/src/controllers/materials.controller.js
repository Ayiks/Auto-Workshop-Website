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
  
  const materials = await req.db.material.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      alternateUnits: true
    }
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
  const { quantityOrdered, unitCost, notes, unitId } = req.body;

  // 1. Basic Validation
  if (!quantityOrdered || quantityOrdered <= 0) {
    throw new AppError('Quantity ordered must be greater than 0', 400);
  }

  // 2. Fetch Material & Units
  const material = await req.db.material.findUnique({
    where: { id: parseInt(id) },
    include: { alternateUnits: true },
  });

  if (!material) throw new AppError('Material not found', 404);
  if (!material.isActive) throw new AppError('Cannot reorder inactive material', 400);

  // 3. --- UNIT & COST LOGIC ---
  let purchaseQty = parseFloat(quantityOrdered); // e.g., 5 (Drums)
  let conversionFactor = 1;
  let finalUnitId = null; // Default to Base Unit (null)

  // Handle Alternate Unit Selection
  if (unitId) {
    // If unitId is provided, check if it's an alternate unit
    // Note: If unitId matches the material's main unit ID (from GlobalUnits), 
    // we treat it as base unit (factor 1). 
    // But usually, alternateUnits array contains the specific conversion rules.
    
    const selectedUnit = material.alternateUnits.find(u => u.unitId === parseInt(unitId));
    
    if (selectedUnit) {
      finalUnitId = selectedUnit.unitId;
      conversionFactor = parseFloat(selectedUnit.factor); // e.g., 200
    }
    // If not found in alternateUnits, we assume it's the Base Unit (if IDs match) or throw error
  }

  // Calculate STOCK to add (Base Units)
  // e.g., 5 Drums * 200 = 1000 Liters
  const stockToAdd = purchaseQty * conversionFactor;

  // Calculate COSTS
  // purchaseUnitCost: What did we pay for ONE Drum? ($500)
  // If user didn't provide cost, estimate it: BaseCost ($2.50) * Factor (200) = $500
  let purchaseUnitCost;
  if (unitCost) {
    purchaseUnitCost = parseFloat(unitCost);
  } else {
    purchaseUnitCost = parseFloat(material.unitCost) * conversionFactor;
  }

  const totalCost = purchaseQty * purchaseUnitCost;

  // Calculate New Base Cost (Weighted Average is better, but here we update to latest price)
  // e.g., $500 / 200 = $2.50 per Liter
  const newBaseUnitCost = purchaseUnitCost / conversionFactor;

  // 4. Transaction
  const result = await req.db.$transaction(async (tx) => {
    // A. Create Reorder Record (Log exactly what the User typed)
    const reorder = await tx.materialReorder.create({
      data: {
        materialId: material.id,
        materialName: material.name,
        materialUnitId: finalUnitId, // Link to "Drum"
        quantityOrdered: purchaseQty, // Record "5"
        unitCost: purchaseUnitCost,   // Record "$500"
        totalCost: totalCost,
        reorderedBy: req.user.id,
        notes,
      },
    });

    // B. Update Material Stock (Convert to Base Units)
    const updatedMaterial = await tx.material.update({
      where: { id: material.id },
      data: {
        quantity: { increment: stockToAdd }, // Add 1000 Liters
        unitCost: newBaseUnitCost,           // Update Base Cost to $2.50
      },
    });

    // C. Audit Log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REORDER',
        entity: 'Material',
        entityId: material.id,
        description: `Reordered ${purchaseQty} ${finalUnitId ? 'Alt Units' : 'Base Units'} of ${material.name}. Added ${stockToAdd} base units to stock.`,
      },
    });

    return { reorder, updatedMaterial };
  });

  res.status(201).json({
    success: true,
    message: 'Material reordered successfully',
    data: result,
  });
});

// @desc    Bulk Reorder materials
// @route   POST /api/materials/bulk-reorder
// @access  Private
export const bulkReorderMaterials = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('No items provided for reorder', 400);
  }

  // 1. Fetch all materials upfront
  const itemIds = items.map(item => parseInt(item.id));
  const materials = await req.db.material.findMany({
    where: { id: { in: itemIds } },
    include: { alternateUnits: true },
  });

  const materialMap = new Map(materials.map(m => [m.id, m]));

  // 2. Transaction
  const results = await req.db.$transaction(async (tx) => {
    const processedItems = [];

    for (const item of items) {
      const materialId = parseInt(item.id);
      const material = materialMap.get(materialId);

      if (!material) throw new AppError(`Material ID ${materialId} not found`, 404);
      if (!material.isActive) throw new AppError(`Material ${material.name} is inactive`, 400);

      // --- LOGIC START ---
      let purchaseQty = parseFloat(item.quantityOrdered);
      let conversionFactor = 1;
      let finalUnitId = null;

      // Find Unit Factor
      if (item.unitId) {
        const selectedUnit = material.alternateUnits.find(u => u.unitId === parseInt(item.unitId));
        if (selectedUnit) {
          finalUnitId = selectedUnit.unitId;
          conversionFactor = parseFloat(selectedUnit.factor);
        }
      }

      // Calculate Stock to Add
      const stockToAdd = purchaseQty * conversionFactor;

      if (isNaN(stockToAdd) || stockToAdd <= 0) {
        throw new AppError(`Invalid quantity for ${material.name}`, 400);
      }

      // Calculate Costs
      let purchaseUnitCost;
      if (item.unitCost) {
        purchaseUnitCost = parseFloat(item.unitCost);
      } else {
        purchaseUnitCost = parseFloat(material.unitCost) * conversionFactor;
      }
      
      const totalCost = purchaseUnitCost * purchaseQty;
      const newBaseUnitCost = purchaseUnitCost / conversionFactor;

      // A. Create Log
      await tx.materialReorder.create({
        data: {
          materialId: material.id,
          materialName: material.name,
          materialUnitId: finalUnitId,
          quantityOrdered: purchaseQty, // Store "5"
          unitCost: purchaseUnitCost,   // Store "$500"
          totalCost: totalCost,
          reorderedBy: req.user.id,
          notes: item.notes || 'Bulk Reorder',
        },
      });

      // B. Update Stock
      await tx.material.update({
        where: { id: material.id },
        data: {
          quantity: { increment: stockToAdd }, // Add 1000
          unitCost: newBaseUnitCost,           // Update to $2.50
        },
      });

      processedItems.push({ 
        materialName: material.name, 
        addedStock: stockToAdd,
        totalCost 
      });
    }

    // Single Audit Log for Bulk Action
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BULK_REORDER',
        entity: 'Material',
        description: `Bulk reordered ${processedItems.length} items.`,
      },
    });

    return processedItems;
  });

  res.status(201).json({
    success: true,
    message: `Successfully restocked ${results.length} materials`,
    data: results,
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