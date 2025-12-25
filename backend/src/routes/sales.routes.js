import express from 'express';
import {
  createSale,
  getAllSales,
  getSale,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
} from '../controllers/sales.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Sales creation - Admin and Sales users
router.post('/', authorize('admin', 'sales'), createSale);

// Sales viewing - Admin only
router.get('/', authorize('admin'), getAllSales);
router.get('/reports/daily', authorize('admin'), getDailyReport);
router.get('/reports/weekly', authorize('admin'), getWeeklyReport);
router.get('/reports/monthly', authorize('admin'), getMonthlyReport);
router.get('/:id', authorize('admin'), getSale);

export default router;