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
  bulkReorderMaterials,
  getInventorySnapshot,
  getRestockOrders,
  receiveRestockOrder,
  markRestockOrderPaid,
  updateRestockOrder,
  adminEditReceivedOrder,
  cancelRestockOrder,
} from '../controllers/materials.controller.js';
import { protect, requirePermission, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// All static/named routes MUST come before /:id to avoid Express matching them as IDs

// Get low stock materials
router.get('/low-stock', requirePermission('materials', 'view'), getLowStockMaterials);

// Inventory snapshot at a given date
router.get('/snapshot', requirePermission('materials', 'view'), getInventorySnapshot);

// Bulk reorder
router.post('/bulk-reorder', requirePermission('materials', 'reorder'), bulkReorderMaterials);

// Restock orders
router.get('/restock-orders', requirePermission('materials', 'view'), getRestockOrders);
router.post('/restock-orders/:orderId/receive', requirePermission('materials', 'reorder'), receiveRestockOrder);
router.post('/restock-orders/:orderId/mark-paid', requirePermission('materials', 'reorder'), markRestockOrderPaid);
router.put('/restock-orders/:orderId', authorize('admin'), updateRestockOrder);
router.put('/restock-orders/:orderId/admin-correct', authorize('admin'), adminEditReceivedOrder);
router.put('/restock-orders/:orderId/cancel', authorize('admin'), cancelRestockOrder);

// CRUD routes
router
  .route('/')
  .get(requirePermission('materials', 'view'), getMaterials)
  .post(requirePermission('materials', 'create'), createMaterial);

// Dynamic /:id routes last
router.post('/:id/reorder', requirePermission('materials', 'reorder'), reorderMaterial);
router.get('/:id/reorders', requirePermission('materials', 'view'), getMaterialReorders);

router
  .route('/:id')
  .get(requirePermission('materials', 'view'), getMaterial)
  .put(requirePermission('materials', 'edit'), updateMaterial)
  .delete(requirePermission('materials', 'delete'), deleteMaterial);

export default router;