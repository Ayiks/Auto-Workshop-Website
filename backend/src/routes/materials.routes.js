import express from 'express';
import {
  getAllMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
} from '../controllers/materials.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by admin and sales
router.get('/', authorize('admin', 'sales'), getAllMaterials);
router.get('/low-stock', authorize('admin'), getLowStockMaterials);
router.get('/:id', authorize('admin', 'sales'), getMaterial);

// Admin-only routes
router.post('/', authorize('admin'), createMaterial);
router.put('/:id', authorize('admin'), updateMaterial);
router.delete('/:id', authorize('admin'), deleteMaterial);

export default router;