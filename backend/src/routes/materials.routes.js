import express from 'express';
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockMaterials,
  reorderMaterial,
  getMaterialReorders,
  bulkReorderMaterials
} from '../controllers/materials.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get low stock materials (before /:id to avoid conflict)
router.get('/low-stock', requirePermission('materials', 'view'), getLowStockMaterials);

// Reorder routes
router.post('/:id/reorder', requirePermission('materials', 'reorder'), reorderMaterial);
router.get('/:id/reorders', requirePermission('materials', 'view'), getMaterialReorders);

// CRUD routes
router
  .route('/')
  .get(requirePermission('materials', 'view'), getMaterials)
  .post(requirePermission('materials', 'create'), createMaterial);

router
  .route('/:id')
  .get(requirePermission('materials', 'view'), getMaterial)
  .put(requirePermission('materials', 'edit'), updateMaterial)
  .delete(requirePermission('materials', 'delete'), deleteMaterial);

// Bulk reorder route
router.post('/bulk-reorder', requirePermission('materials', 'reorder'), bulkReorderMaterials);

export default router;