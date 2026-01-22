import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create operational expense
// @route   POST /api/expenses
// @access  Private (requires 'expenses:create' permission)
export const createExpense = asyncHandler(async (req, res) => {
  const { category, description, amount, expenseDate, notes } = req.body;

  // Validation
  if (!category || !description || !amount) {
    throw new AppError(
      'Please provide category, description, and amount',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (amount <= 0) {
    throw new AppError(
      'Amount must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Valid operational categories
  const validCategories = [
    'rent',
    'utilities',
    'salaries',
    'maintenance',
    'supplies',
    'insurance',
    'marketing',
    'transportation',
    'miscellaneous',
  ];

  if (!validCategories.includes(category.toLowerCase())) {
    throw new AppError(
      `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  const expense = await prisma.expense.create({
    data: {
      type: 'operational',
      category: category.toLowerCase(),
      description: description.trim(),
      amount: parseFloat(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      source: 'manual',
      isReadOnly: false,
      recordedBy: req.user.id,
      notes: notes?.trim(),
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      description: `Created ${category} expense: ${description}. Amount: GH₵${amount}`,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense,
  });
});

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (requires 'expenses:view' permission)
export const getExpenses = asyncHandler(async (req, res) => {
  const { type, category, startDate, endDate, source } = req.query;

  const where = {};

  // Filter by type
  if (type) {
    where.type = type;
  }

  // Filter by category
  if (category) {
    where.category = category;
  }

  // Filter by source
  if (source) {
    where.source = source;
  }

  // Date filtering
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      materialReorder: {
        select: {
          id: true,
          materialName: true,
          quantityOrdered: true,
          unitCost: true,
        },
      },
    },
    orderBy: { expenseDate: 'desc' },
  });

  // Calculate totals
  const totals = {
    cog: 0,
    operational: 0,
  };

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    if (expense.type === 'cog') {
      totals.cog += amount;
    } else if (expense.type === 'operational') {
      totals.operational += amount;
    }
  });

  res.status(200).json({
    success: true,
    count: expenses.length,
    totals,
    data: expenses,
  });
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private (requires 'expenses:view' permission)
export const getExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await prisma.expense.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
        },
      },
      materialReorder: {
        include: {
          material: {
            select: {
              name: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: expense,
  });
});

// @desc    Update operational expense
// @route   PUT /api/expenses/:id
// @access  Private (requires 'expenses:edit' permission)
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category, description, amount, expenseDate, notes } = req.body;

  const expense = await prisma.expense.findUnique({
    where: { id: parseInt(id) },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404, 'NOT_FOUND');
  }

  // Cannot edit read-only (system-generated) expenses
  if (expense.isReadOnly) {
    throw new AppError(
      'Cannot edit system-generated expense (COGS from reorders)',
      400,
      'INVALID_OPERATION'
    );
  }

  // Can only edit operational expenses
  if (expense.type !== 'operational') {
    throw new AppError(
      'Can only edit operational expenses',
      400,
      'INVALID_OPERATION'
    );
  }

  // Validation
  if (amount !== undefined && amount <= 0) {
    throw new AppError(
      'Amount must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  const updateData = {};
  if (category) updateData.category = category.toLowerCase();
  if (description) updateData.description = description.trim();
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (expenseDate) updateData.expenseDate = new Date(expenseDate);
  if (notes !== undefined) updateData.notes = notes?.trim();

  const updatedExpense = await prisma.expense.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Expense',
      entityId: updatedExpense.id,
      description: `Updated ${updatedExpense.category} expense #${updatedExpense.id}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: updatedExpense,
  });
});

// @desc    Delete operational expense
// @route   DELETE /api/expenses/:id
// @access  Private (requires 'expenses:delete' permission)
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await prisma.expense.findUnique({
    where: { id: parseInt(id) },
  });

  if (!expense) {
    throw new AppError('Expense not found', 404, 'NOT_FOUND');
  }

  // Cannot delete read-only (system-generated) expenses
  if (expense.isReadOnly) {
    throw new AppError(
      'Cannot delete system-generated expense (COGS from reorders)',
      400,
      'INVALID_OPERATION'
    );
  }

  // Can only delete operational expenses
  if (expense.type !== 'operational') {
    throw new AppError(
      'Can only delete operational expenses',
      400,
      'INVALID_OPERATION'
    );
  }

  await prisma.expense.delete({
    where: { id: parseInt(id) },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Expense',
      entityId: parseInt(id),
      description: `Deleted ${expense.category} expense: ${expense.description}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Expense deleted successfully',
  });
});

// @desc    Get expenses by category
// @route   GET /api/expenses/by-category
// @access  Private (requires 'expenses:view' permission)
export const getExpensesByCategory = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {
    type: 'operational', // Only operational expenses have meaningful categories
  };

  // Date filtering
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const expensesByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true },
    _count: true,
  });

  const totalOperational = expensesByCategory.reduce(
    (sum, cat) => sum + parseFloat(cat._sum.amount || 0),
    0
  );

  res.status(200).json({
    success: true,
    totalOperational,
    data: expensesByCategory,
  });
});

// @desc    Get COGS expenses (material reorders)
// @route   GET /api/expenses/cogs
// @access  Private (requires 'expenses:view' permission)
export const getCOGSExpenses = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {
    type: 'cog',
  };

  // Date filtering
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const cogsExpenses = await prisma.expense.findMany({
    where,
    include: {
      materialReorder: {
        include: {
          material: {
            select: {
              name: true,
              quantity: true,
            },
          },
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { expenseDate: 'desc' },
  });

  const totalCOGS = cogsExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );

  res.status(200).json({
    success: true,
    count: cogsExpenses.length,
    totalCOGS,
    data: cogsExpenses,
  });
});

// Add this to your expenseController.js

// @desc    Get expense statistics
// @route   GET /api/expenses/stats
// @access  Private (requires 'expenses:view' permission)
export const getExpenseStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};

  // Date filtering
  if (startDate || endDate) {
    where.expenseDate = {};
    if (startDate) where.expenseDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  // Get all expenses
  const allExpenses = await prisma.expense.findMany({
    where,
    select: {
      type: true,
      amount: true,
      expenseDate: true,
    },
  });

  // Calculate totals
  let totalExpenses = 0;
  let totalCOGS = 0;
  let totalOperational = 0;

  allExpenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    totalExpenses += amount;
    
    if (expense.type === 'cog') {
      totalCOGS += amount;
    } else if (expense.type === 'operational') {
      totalOperational += amount;
    }
  });

  // Get current month expenses
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const thisMonthExpenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
    select: {
      amount: true,
    },
  });

  const thisMonth = thisMonthExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );

  res.status(200).json({
    success: true,
    data: {
      totalExpenses: totalExpenses.toFixed(2),
      totalCOGS: totalCOGS.toFixed(2),
      totalOperational: totalOperational.toFixed(2),
      thisMonth: thisMonth.toFixed(2),
    },
  });
});

// @desc    Revert (Delete) a Material Reorder
// @route   DELETE /api/expenses/:id/revert-reorder
// @access  Private (Admin/Manager)
export const revertReorder = asyncHandler(async (req, res) => {
  const { id } = req.params; // This is the Expense ID

  await prisma.$transaction(async (tx) => {
    // 1. Find the Reorder linked to this Expense
    const reorder = await tx.materialReorder.findFirst({
      where: { expenseId: parseInt(id) },
      include: { material: true }
    });

    if (!reorder) {
      throw new AppError('Linked material reorder record not found', 404);
    }

    // 2. Safety Check: Do we have enough stock to revert?
    // If you bought 10, but now have 2 in stock (because you sold 8),
    // you cannot return/delete the purchase of 10 (stock would become -8).
    const currentMaterial = await tx.material.findUnique({
      where: { id: reorder.materialId }
    });

    if (!currentMaterial) {
      throw new AppError('Material no longer exists', 404);
    }

    if (currentMaterial.quantity < reorder.quantityOrdered) {
      throw new AppError(
        `Cannot revert: Stock too low. You bought ${reorder.quantityOrdered} but only have ${currentMaterial.quantity} left.`,
        400
      );
    }

    // 3. Subtract from Inventory
    await tx.material.update({
      where: { id: reorder.materialId },
      data: {
        quantity: { decrement: reorder.quantityOrdered }
      }
    });

    // 4. Delete the Reorder Log
    await tx.materialReorder.delete({
      where: { id: reorder.id }
    });

    // 5. Delete the Expense
    // Note: We delete expense LAST to avoid foreign key constraints if set up that way
    await tx.expense.delete({
      where: { id: parseInt(id) }
    });

    // 6. Audit Log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REVERT_REORDER',
        entity: 'Material',
        entityId: reorder.materialId,
        description: `Reversed purchase of ${reorder.quantityOrdered} ${reorder.materialName}. Stock reduced.`,
      },
    });
  });

  res.status(200).json({ success: true, message: 'Reorder reverted and inventory adjusted' });
});

// @desc    Correct (Edit) a Material Reorder
// @route   PUT /api/expenses/:id/correct-reorder
// @access  Private (Admin/Manager)
export const correctReorder = asyncHandler(async (req, res) => {
  const { id } = req.params; // Expense ID
  const { newQuantity, newUnitCost } = req.body;

  if (!newQuantity || newQuantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Find existing records
    const reorder = await tx.materialReorder.findFirst({
      where: { expenseId: parseInt(id) },
    });

    if (!reorder) {
      throw new AppError('Reorder record not found', 404);
    }

    // 2. Calculate Diffs
    const oldQty = Number(reorder.quantityOrdered);
    const targetQty = parseFloat(newQuantity);
    const targetCost = parseFloat(newUnitCost);
    
    // Difference: If New (12) - Old (10) = +2 (Add 2 to stock)
    // Difference: If New (8) - Old (10) = -2 (Remove 2 from stock)
    const qtyDifference = targetQty - oldQty;
    const newTotalCost = targetQty * targetCost;

    // 3. Safety Check if reducing stock
    if (qtyDifference < 0) {
      const currentMaterial = await tx.material.findUnique({
        where: { id: reorder.materialId }
      });
      
      // If we are removing 2 items (qtyDifference is -2), check if we have at least 2 items
      if (currentMaterial.quantity + qtyDifference < 0) {
        throw new AppError(`Cannot reduce quantity: Insufficient stock to remove ${Math.abs(qtyDifference)} items.`, 400);
      }
    }

    // 4. Update Material (Inventory & Unit Cost)
    await tx.material.update({
      where: { id: reorder.materialId },
      data: {
        quantity: { increment: qtyDifference }, // Works for positive and negative numbers
        unitCost: targetCost // Update the material's current cost to the corrected value
      }
    });

    // 5. Update Reorder Log
    await tx.materialReorder.update({
      where: { id: reorder.id },
      data: {
        quantityOrdered: targetQty,
        unitCost: targetCost,
        totalCost: newTotalCost
      }
    });

    // 6. Update Expense
    const updatedExpense = await tx.expense.update({
      where: { id: parseInt(id) },
      data: {
        amount: newTotalCost,
        // Update description to reflect new Qty
        description: `Material reorder: ${reorder.materialName} (${targetQty} units)`, 
        notes: `Correction: Modified by ${req.user.firstName}. Prev Qty: ${oldQty}`
      }
    });

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CORRECT_REORDER',
        entity: 'Material',
        entityId: reorder.materialId,
        description: `Corrected reorder #${reorder.id}. Qty: ${oldQty} -> ${targetQty}. Cost: ${targetCost}`,
      },
    });

    return updatedExpense;
  });

  res.status(200).json({ success: true, data: result });
});