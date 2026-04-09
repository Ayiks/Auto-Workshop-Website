import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getCOGSExpenses,
  getExpenseStats,
  adminCorrectExpense,
  adminDeleteExpense,
} from '../controllers/expenses.controller.js';
import { protect, requirePermission, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

//statistics
router.get(
  '/stats',
  requirePermission('expenses', 'view'),
  getExpenseStats
);

// Special routes (before /:id to avoid conflict)
router.get(
  '/by-category',
  requirePermission('expenses', 'view'),
  getExpensesByCategory
);

router.get(
  '/cogs',
  requirePermission('expenses', 'view'),
  getCOGSExpenses
);

// CRUD routes
router
  .route('/')
  .get(requirePermission('expenses', 'view'), getExpenses)
  .post(requirePermission('expenses', 'create'), createExpense);

router
  .route('/:id')
  .get(requirePermission('expenses', 'view'), getExpense)
  .put(requirePermission('expenses', 'edit'), updateExpense)
  .delete(requirePermission('expenses', 'delete'), deleteExpense);

// Admin-only: correct the amount on a locked (COG/auto-generated) expense record
router.put('/:id/admin-correct', authorize('admin'), adminCorrectExpense);

// Admin-only: delete a locked (COG/auto-generated) expense record
router.delete('/:id/admin-delete', authorize('admin'), adminDeleteExpense);


export default router;