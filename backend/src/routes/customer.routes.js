import express from 'express';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
// import requirePermission instead of authorize
// authorize() only accepts role strings, not resource/action pairs
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// == Read Routes ==
// All authenticated staff can look up customers (mechanics need this for job cards)
router.get('/', getCustomers);
router.get('/:id', getCustomer);

// == Write Routes ==
// was authorize('admin', 'customer', 'create') which is wrong usage
router.post('/', requirePermission('customers', 'create'), createCustomer);
router.put('/:id', requirePermission('customers', 'edit'), updateCustomer);

// == Delete Routes ==
router.delete('/:id', requirePermission('customers', 'delete'), deleteCustomer);

export default router;