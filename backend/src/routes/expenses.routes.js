import express from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpensesSummary,
} from '../controllers/expenses.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Expense routes
router.post('/', createExpense);
router.get('/', getAllExpenses);
router.get('/summary/category', getExpensesSummary);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;