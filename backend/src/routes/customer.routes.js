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
// Requires customers.view. Note: the permissions UI auto-grants customers.view
// as a dependency of jobs.create / sales.create, so staff who create job cards
// or sales still get customer lookup automatically.
router.get('/', requirePermission('customers', 'view'), getCustomers);
router.get('/:id', requirePermission('customers', 'view'), getCustomer);

// == Write Routes ==
// was authorize('admin', 'customer', 'create') which is wrong usage
router.post('/', requirePermission('customers', 'create'), createCustomer);
router.put('/:id', requirePermission('customers', 'edit'), updateCustomer);

// == Delete Routes ==
router.delete('/:id', requirePermission('customers', 'delete'), deleteCustomer);

export default router;