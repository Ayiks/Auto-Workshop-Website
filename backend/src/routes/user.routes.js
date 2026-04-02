import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserPermissions,
  changeUserPassword,
  deactivateUser,
  activateUser,
  deleteUser,
  getUserStats,
} from '../controllers/user.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route (before /:id to avoid conflict)
router.get('/stats', requirePermission('users', 'view'), getUserStats);

// User actions
router.put(
  '/:id/permissions',
  requirePermission('users', 'managePermissions'),
  updateUserPermissions
);

router.put(
  '/:id/password',
  requirePermission('users', 'edit'),
  changeUserPassword
);

router.put(
  '/:id/deactivate',
  requirePermission('users', 'edit'),
  deactivateUser
);

router.put(
  '/:id/activate',
  requirePermission('users', 'edit'),
  activateUser
);

// CRUD routes
router
  .route('/')
  .get(requirePermission('users', 'view'), getUsers)
  .post(requirePermission('users', 'create'), createUser);

router
  .route('/:id')
  .get(requirePermission('users', 'view'), getUser)
  .put(requirePermission('users', 'edit'), updateUser)
  .delete(requirePermission('users', 'delete'), deleteUser);

export default router;