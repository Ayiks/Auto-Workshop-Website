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
router.get('/stats', requirePermission('payments', 'view'), getPaymentStats);
router.get('/invoice/:invoiceId', requirePermission('payments', 'view'), getInvoicePayments);

// CRUD routes
router
  .route('/')
  .get(requirePermission('payments', 'view'), getPayments)
  .post(requirePermission('payments', 'create'), recordPayment);

router
  .route('/:id')
  .get(requirePermission('payments', 'view'), getPayment)
  .delete(authorize('admin'), voidPayment);

export default router;