import express from 'express';
import { login, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

export default router;