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
  // revertReorder,
  // correctReorder
} from '../controllers/expenses.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

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

// 1. Route for Reverting (Deleting)
// router.delete(
//   '/:id/revert-reorder', 
//   requirePermission('expenses', 'delete'), 
//   revertReorder
// );

// 2. Route for Correcting (Updating) - Note the URL change here
// router.put(
//   '/:id/correct-reorder', 
//   requirePermission('expenses', 'edit'), 
//   correctReorder
// );


export default router;