import express from 'express';
import {
  recordPayment,
  getPayments,
  getPayment,
  getInvoicePayments,
  getPaymentStats,
  voidPayment,
} from '../controllers/payment.controller.js';
import { protect, requirePermission, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', getPaymentStats);
router.get('/invoice/:invoiceId', getInvoicePayments);

// CRUD routes
router
  .route('/')
  .get(getPayments)
  .post(requirePermission('sales', 'create'), recordPayment);

router
  .route('/:id')
  .get(getPayment)
  .delete(authorize('admin'), voidPayment);

export default router;