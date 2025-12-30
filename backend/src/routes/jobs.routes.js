import express from 'express';
import {
  createJob,
  getAllJobs,
  getJob,
  updateJob,
  addJobMaterials,
  updateJobMaterial,
  deleteJobMaterial,
} from '../controllers/jobs.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Job CRUD
router.post('/', authorize('admin', 'mechanic'), createJob);
router.get('/', authorize('admin', 'mechanic'), getAllJobs);
router.get('/:id', authorize('admin', 'mechanic'), getJob);
router.put('/:id', authorize('admin', 'mechanic'), updateJob);

// Job materials management
router.post('/:id/materials', authorize('admin', 'mechanic'), addJobMaterials);
router.put('/:jobId/materials/:materialId', authorize('admin', 'mechanic'), updateJobMaterial);
router.delete('/:jobId/materials/:materialId', authorize('admin', 'mechanic'), deleteJobMaterial);

export default router;