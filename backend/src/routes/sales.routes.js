import express from 'express';
import {
  createSale,
  getSales,
  getSale,
  getSalesStats,
} from '../controllers/sales.controller.js';
import { protect, canAccessResource } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route (before /:id to avoid conflict)
router.get('/stats', canAccessResource('sales', 'view'), getSalesStats);

// CRUD routes
router
  .route('/')
  .get(canAccessResource('sales', 'view'), getSales)
  .post(canAccessResource('sales', 'create'), createSale);

router
  .route('/:id')
  .get(canAccessResource('sales', 'view'), getSale);

export default router;