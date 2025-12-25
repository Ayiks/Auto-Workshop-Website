import { prisma } from '../server.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private (Admin, Sales)
export const getAllMaterials = async (req, res, next) => {
  try {
    const { active = 'true', search } = req.query;

    const where = {
      isActive: active === 'true',
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        costPrice: true,
        sellingPrice: true,
        quantity: true,
        lowStockLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      count: materials.length,
      materials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single material
// @route   GET /api/materials/:id
// @access  Private (Admin, Sales)
export const getMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!material) {
      throw new AppError('Material not found', 404, 'RESOURCE_NOT_FOUND');
    }

    res.json({
      success: true,
      material,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create material
// @route   POST /api/materials
// @access  Private (Admin only)
export const createMaterial = async (req, res, next) => {
  try {
    const { name, costPrice, sellingPrice, quantity, lowStockLevel } = req.body;

    // Validate input
    if (!name || !costPrice || !sellingPrice || quantity === undefined) {
      throw new AppError('Name, cost price, selling price, and quantity are required', 400, 'VALIDATION_ERROR');
    }

    if (parseFloat(costPrice) < 0 || parseFloat(sellingPrice) < 0) {
      throw new AppError('Prices must be positive', 400, 'VALIDATION_ERROR');
    }

    if (parseFloat(sellingPrice) < parseFloat(costPrice)) {
      throw new AppError('Selling price must be greater than or equal to cost price', 400, 'VALIDATION_ERROR');
    }

    if (parseInt(quantity) < 0) {
      throw new AppError('Quantity must be non-negative', 400, 'VALIDATION_ERROR');
    }

    const material = await prisma.material.create({
      data: {
        name: name.trim(),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        quantity: parseInt(quantity),
        lowStockLevel: lowStockLevel ? parseInt(lowStockLevel) : 10,
        createdById: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      material,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private (Admin only)
export const updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, costPrice, sellingPrice, quantity, lowStockLevel, isActive } = req.body;

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingMaterial) {
      throw new AppError('Material not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Build update data
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (costPrice !== undefined) {
      if (parseFloat(costPrice) < 0) {
        throw new AppError('Cost price must be positive', 400, 'VALIDATION_ERROR');
      }
      updateData.costPrice = parseFloat(costPrice);
    }
    if (sellingPrice !== undefined) {
      if (parseFloat(sellingPrice) < 0) {
        throw new AppError('Selling price must be positive', 400, 'VALIDATION_ERROR');
      }
      updateData.sellingPrice = parseFloat(sellingPrice);
    }
    if (quantity !== undefined) {
      if (parseInt(quantity) < 0) {
        throw new AppError('Quantity must be non-negative', 400, 'VALIDATION_ERROR');
      }
      updateData.quantity = parseInt(quantity);
    }
    if (lowStockLevel !== undefined) updateData.lowStockLevel = parseInt(lowStockLevel);
    if (isActive !== undefined) updateData.isActive = isActive;

    // Validate selling price >= cost price
    const finalCostPrice = updateData.costPrice || existingMaterial.costPrice;
    const finalSellingPrice = updateData.sellingPrice || existingMaterial.sellingPrice;

    if (parseFloat(finalSellingPrice) < parseFloat(finalCostPrice)) {
      throw new AppError('Selling price must be greater than or equal to cost price', 400, 'VALIDATION_ERROR');
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Material updated successfully',
      material,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete material (soft delete)
// @route   DELETE /api/materials/:id
// @access  Private (Admin only)
export const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: { id: parseInt(id) },
    });

    if (!material) {
      throw new AppError('Material not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Soft delete
    await prisma.material.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock materials
// @route   GET /api/materials/low-stock
// @access  Private (Admin only)
export const getLowStockMaterials = async (req, res, next) => {
  try {
    const materials = await prisma.material.findMany({
      where: {
        isActive: true,
        quantity: {
          lte: prisma.material.fields.lowStockLevel,
        },
      },
      orderBy: { quantity: 'asc' },
    });

    // Manual filter since Prisma doesn't support field comparison in where clause
    const lowStockMaterials = materials.filter(m => m.quantity <= m.lowStockLevel);

    res.json({
      success: true,
      count: lowStockMaterials.length,
      materials: lowStockMaterials,
    });
  } catch (error) {
    next(error);
  }
};