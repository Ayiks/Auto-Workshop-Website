import express from 'express';
import { register, login,  getMe, changePassword, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/me', protect, updateProfile);

export default router;