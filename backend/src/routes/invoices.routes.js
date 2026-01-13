import express from 'express';
import {
  generateInvoice,
  getInvoices,
  getInvoice,
  getInvoiceByNumber,
  getOutstandingInvoices,
  updateInvoice,
  getInvoiceStats,
} from '../controllers/invoice.controller.js';
import { protect, requirePermission, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', getInvoiceStats);
router.get('/outstanding', getOutstandingInvoices);
router.get('/number/:invoiceNumber', getInvoiceByNumber);

// CRUD routes
router
  .route('/')
  .get(getInvoices)
  .post(generateInvoice);

router
  .route('/:id')
  .get(getInvoice)
  .put(authorize('admin'), updateInvoice);

export default router;