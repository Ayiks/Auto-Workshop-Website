import express from 'express';
import { login, verifyToken, logout, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/verify', authenticate, verifyToken);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

export default router;