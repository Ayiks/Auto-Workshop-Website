import express from 'express';
import {
  getSettings,
  updateSettings,
  updateLogo,
  getBoothPrice,
} from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication)
router.get('/', getSettings);
router.get('/booth-price', getBoothPrice);

// Protected routes (admin only)
router.put('/', protect, authorize('admin'), updateSettings);
router.put('/logo', protect, authorize('admin'), updateLogo);

export default router;