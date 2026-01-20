import express from 'express';
import {
  getBoothService,
  getBoothServices,
  createBoothService,
  updateBoothService,
  deleteBoothService,
  toggleBoothService
} from '../controllers/service.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Booth service routes
router
  .route('/booth')
  .get(requirePermission('booth', 'view'), getBoothService)
  // .put(requirePermission('booth', 'edit'), );

export default router;