import { prisma } from '../server.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private (Admin only)
export const createExpense = async (req, res, next) => {
  try {
    const { description, category, amount, expenseDate, notes } = req.body;

    // Validate
    if (!description || !category || !amount) {
      throw new AppError('Description, category, and amount are required', 400, 'VALIDATION_ERROR');
    }

    if (parseFloat(amount) <= 0) {
      throw new AppError('Amount must be greater than zero', 400, 'VALIDATION_ERROR');
    }

    const validCategories = ['rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'];
    if (!validCategories.includes(category)) {
      throw new AppError('Invalid expense category', 400, 'VALIDATION_ERROR');
    }

    const expense = await prisma.expense.create({
      data: {
        description: description.trim(),
        category,
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        notes: notes?.trim(),
        recordedBy: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Admin only)
export const getAllExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, startDate, endDate } = req.query;

    const where = {};

    // Filter by category
    if (category) {
      where.category = category;
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

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { expenseDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private (Admin only)
export const getExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!expense) {
      throw new AppError('Expense not found', 404, 'RESOURCE_NOT_FOUND');
    }

    res.json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin only)
export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, category, amount, expenseDate, notes } = req.body;

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingExpense) {
      throw new AppError('Expense not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Build update data
    const updateData = {};
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) {
      const validCategories = ['rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'];
      if (!validCategories.includes(category)) {
        throw new AppError('Invalid expense category', 400, 'VALIDATION_ERROR');
      }
      updateData.category = category;
    }
    if (amount !== undefined) {
      if (parseFloat(amount) <= 0) {
        throw new AppError('Amount must be greater than zero', 400, 'VALIDATION_ERROR');
      }
      updateData.amount = parseFloat(amount);
    }
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate);
    if (notes !== undefined) updateData.notes = notes?.trim();

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin only)
export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
    });

    if (!expense) {
      throw new AppError('Expense not found', 404, 'RESOURCE_NOT_FOUND');
    }

    await prisma.expense.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expenses summary by category
// @route   GET /api/expenses/summary/category
// @access  Private (Admin only)
export const getExpensesSummary = async (req, res, next) => {
  try {
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

    // Get all expenses in date range
    const expenses = await prisma.expense.findMany({
      where,
      select: {
        category: true,
        amount: true,
      },
    });

    // Group by category
    const summary = expenses.reduce((acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      acc[exp.category] += parseFloat(exp.amount);
      return acc;
    }, {});

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    res.json({
      success: true,
      summary,
      totalExpenses,
    });
  } catch (error) {
    next(error);
  }
};