import express from 'express';
import { getVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicles.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getVehicles);
router.get('/:id', getVehicle);
router.post('/', requirePermission('customers', 'create'), createVehicle);
router.put('/:id', requirePermission('customers', 'edit'), updateVehicle);
router.delete('/:id', requirePermission('customers', 'delete'), deleteVehicle);

export default router;
