import express from 'express';
import {
  getReceipts,
  getReceipt,
  getReceiptByNumber,
  getSaleReceipt,
  getPaymentReceipt,
  getReceiptStats,
} from '../controllers/receipt.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', getReceiptStats);
router.get('/number/:receiptNumber', getReceiptByNumber);
router.get('/sale/:saleId', getSaleReceipt);
router.get('/payment/:paymentId', getPaymentReceipt);

// General routes
router.get('/', getReceipts);
router.get('/:id', getReceipt);

export default router;