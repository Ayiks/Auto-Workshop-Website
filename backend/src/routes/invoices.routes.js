import express from 'express';
import {
  generateInvoice,
  getInvoices,
  getInvoice,
  getInvoiceByNumber,
  getOutstandingInvoices,
  updateInvoice,
  getInvoiceStats,
  voidInvoice
} from '../controllers/invoice.controller.js';
import { protect, requirePermission, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', requirePermission('invoices', 'view'), getInvoiceStats);
router.get('/outstanding', requirePermission('invoices', 'view'), getOutstandingInvoices);
router.get('/number/:invoiceNumber', requirePermission('invoices', 'view'), getInvoiceByNumber);

// CRUD routes
router
  .route('/')
  .get(requirePermission('invoices', 'view'), getInvoices)
  .post(requirePermission('invoices', 'create'), generateInvoice);

router
  .route('/:id')
  .get(requirePermission('invoices', 'view'), getInvoice)
  .put(authorize('admin'), updateInvoice);

router
  .route('/:id/void')
  .post(authorize('admin'), voidInvoice);

export default router;