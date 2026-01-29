import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// == Read Routes ==
// Accessible by all authenticated staff (Mechanics need to find customers to make job cards)
router.get('/', getCustomers);
router.get('/:id', getCustomer);

// == Write Routes ==
// Restricted to Admin and Manager
router.post('/', authorize('admin', 'customer', 'create'), createCustomer);
router.put('/:id', authorize('admin', 'customer', 'update'), updateCustomer);

// == Delete Routes ==
// Restricted to Admin only (Safety measure)
router.delete('/:id', authorize('admin', 'customer', 'delete'), deleteCustomer);

export default router;