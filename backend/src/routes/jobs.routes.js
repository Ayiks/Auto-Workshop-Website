import express from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  addJobMaterial,
  removeJobMaterial,
  completeJob,
  deleteJob,
  getJobStats,
} from '../controllers/jobs.controller.js';
import { 
  protect, 
  canAccessResource, 
  requirePermission,
  requireJobTypeAccess 
} from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats route (before /:id to avoid conflict)
router.get('/stats', canAccessResource('jobs', 'view'), getJobStats);

// CRUD routes
router
  .route('/')
  .get(requireJobTypeAccess, canAccessResource('jobs', 'view'), getJobs)
  .post(requireJobTypeAccess, canAccessResource('jobs', 'create'), createJob);

// Job actions
router.put(
  '/:id/complete',
  requireJobTypeAccess,
  canAccessResource('jobs', 'edit'),
  completeJob
);

// Update job status
router.patch(
  '/:id/status',
  requireJobTypeAccess,
  canAccessResource('jobs', 'edit'),
  updateJob
);

// Job materials management
router
  .route('/:id/materials')
  .post(requireJobTypeAccess, canAccessResource('jobs', 'edit'), addJobMaterial);

router.delete(
  '/:id/materials/:materialId',
  requireJobTypeAccess,
  canAccessResource('jobs', 'edit'),
  removeJobMaterial
);

// Single job routes
router
  .route('/:id')
  .get(requireJobTypeAccess, canAccessResource('jobs', 'view'), getJob)
  .put(requireJobTypeAccess, canAccessResource('jobs', 'edit'), updateJob)
  .delete(requirePermission('jobs', 'delete'), deleteJob);

export default router;