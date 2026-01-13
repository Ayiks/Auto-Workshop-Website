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