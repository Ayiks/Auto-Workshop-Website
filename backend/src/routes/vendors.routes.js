import express from 'express';
import { getVendors, getVendor, createVendor, updateVendor, deleteVendor } from '../controllers/vendors.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getVendors);
router.get('/:id', getVendor);
router.post('/', requirePermission('materials', 'edit'), createVendor);
router.put('/:id', requirePermission('materials', 'edit'), updateVendor);
router.delete('/:id', requirePermission('materials', 'edit'), deleteVendor);

export default router;
