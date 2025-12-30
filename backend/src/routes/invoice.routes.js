import express from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoice,
  getInvoiceByNumber,
  deleteInvoice,
  updatePaymentStatus,
} from '../controllers/invoices.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Invoice routes
router.post('/', authorize('admin', 'mechanic'), createInvoice);
router.get('/', authorize('admin', 'mechanic'), getAllInvoices);
router.get('/number/:invoiceNumber', authorize('admin', 'mechanic'), getInvoiceByNumber);
router.get('/:id', authorize('admin', 'mechanic'), getInvoice);
router.put('/:id/payment', authorize('admin', 'mechanic'), updatePaymentStatus);
router.delete('/:id', authorize('admin'), deleteInvoice);

export default router;