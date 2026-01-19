import express from 'express';
import {
  getSalesReport,
  getJobReport,
  getExpenseReport,
  getProfitLoss,
  getRevenueReport,
  getMaterialUsageReport,
  getDashboardOverview,
} from '../controllers/report.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard overview (accessible to all authenticated users)
router.get('/dashboard', getDashboardOverview);

// Sales reports
router.get(
  '/sales',
  requirePermission('reports', 'view'),
  getSalesReport
);

// Job reports
router.get(
  '/jobs',
  requirePermission('reports', 'view'),
  getJobReport
);

// Expense reports
router.get(
  '/expenses',
  requirePermission('reports', 'view'),
  getExpenseReport
);

// Profit & Loss statement (advanced permission)
router.get(
  '/profit-loss',
  requirePermission('reports', 'viewAdvanced'),
  getProfitLoss
);

// Revenue breakdown
router.get(
  '/revenue',
  requirePermission('reports', 'view'),
  getRevenueReport
);

// Material usage report
router.get(
  '/material-usage',
  requirePermission('reports', 'view'),
  getMaterialUsageReport
);

export default router;