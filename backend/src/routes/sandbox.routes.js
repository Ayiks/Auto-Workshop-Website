/**
 * sandbox.routes.js
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createSandbox, getSandboxStatus, cleanupExpiredSandboxes } from '../controllers/sandbox.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Rate limiter: max 3 sandbox creations per IP per hour
// Prevents abuse / DB spam from bots hitting the "Try Demo" button
// ---------------------------------------------------------------------------
const sandboxLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many sandbox requests from this IP. Please try again in an hour.',
    },
  },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Public: one-click sandbox creation (rate limited)
router.post('/create', sandboxLimiter, createSandbox);

// Private: check how much time is left on the sandbox
router.get('/status', protect, getSandboxStatus);

// Internal: cron-triggered cleanup (secured by x-cron-secret header)
router.post('/cleanup', cleanupExpiredSandboxes);

export default router;