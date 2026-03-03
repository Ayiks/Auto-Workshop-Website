import express from 'express';
import { registerUser, verifyEmail, setupWorkspace, login,  getMe, changePassword, updateProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register',    registerUser);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/me', protect, updateProfile);
router.post('/setup-workspace', protect, setupWorkspace);

export default router;