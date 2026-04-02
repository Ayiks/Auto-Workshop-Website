// src/routes/service.route.js
import express from 'express';
import {
  getBoothService,
  getBoothServices,
  createBoothService,
  updateBoothService,
  deleteBoothService,
  toggleBoothService,
  getServiceCategories,
  getItemCategories,
  getServicePrice,
  getBoothServiceStats
} from '../controllers/service.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Special routes that don't conflict with the :id pattern (must come first!)
router.get('/booth/categories', requirePermission('booth', 'view'), getServiceCategories);
router.get('/booth/items/:serviceCategory', requirePermission('booth', 'view'), getItemCategories);
router.get('/booth/price', requirePermission('booth', 'view'), getServicePrice);
router.get('/booth/stats', requirePermission('booth', 'view'), getBoothServiceStats);

// Booth services routes
router
  .route('/booth')
  .get(requirePermission('booth', 'view'), getBoothServices)
  .post(requirePermission('booth', 'create'), createBoothService);

// Single booth service routes (this will catch :id patterns)
router
  .route('/booth/:id')
  .get(requirePermission('booth', 'view'), getBoothService)
  .put(requirePermission('booth', 'edit'), updateBoothService)
  .delete(requirePermission('booth', 'delete'), deleteBoothService);

// Booth service toggle status
router.put('/booth/:id/toggle', requirePermission('booth', 'edit'), toggleBoothService);

export default router;